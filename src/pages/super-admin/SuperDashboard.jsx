import {
  Users,
  Package,
  CheckCircle,
  Clock,
  FolderKanban,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import clientService from "../../services/clientAddService";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
} from "recharts";
import TablePageSkeleton from "../../components/ui/tableskeleton";
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import "../../App.css";
import { formatDateUS, formatDateUTC } from "../../utils/formatdate";

export default function SuperDashboard() {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const clientsRes = await clientService.getClients();
        setClients(clientsRes || []);

        const projectsRes = await fetch(
          `${import.meta.env.VITE_API_BASE}/projects/all/dashboard`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const customersRes = await fetch(
          `${import.meta.env.VITE_API_BASE}/customers`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const customersData = await customersRes.json();
        setCustomers(customersData || []);
        const projectsData = await projectsRes.json();
        setProjects(projectsData || []);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading) return <TablePageSkeleton />;

  const clientMap = {};
  clients.forEach((c) => {
    clientMap[c._id] =
      c.firstName && c.lastName
        ? `${c.firstName} ${c.lastName}`
        : c.full_name || "Unknown Client";
  });

  const customerMap = {};
  customers.forEach((c) => {
    customerMap[c._id] = c.company_name;
  });

  const filteredProjects = Array.isArray(projects) && selectedClient
    ? projects.filter(
      (p) => p.clientId === selectedClient || p.created_by === selectedClient
    )
    : Array.isArray(projects) ? projects : [];

  const stats = {
    totalClients: clients.length,
    totalProjects: filteredProjects.length,
    activeProjects: filteredProjects.filter((p) =>
      ["processing", "awarded"].includes(p.status)
    ).length,
    completedProjects: filteredProjects.filter(
      (p) => p.status === "completed"
    ).length,
    pendingProjects: filteredProjects.filter((p) =>
      ["open"].includes(p.status)
    ).length,
  };

  const pieData = [
    { name: "Active", value: stats.activeProjects },
    { name: "Completed", value: stats.completedProjects },
    { name: "Pending", value: stats.pendingProjects },
  ];
  const filteredPieData = pieData.filter(item => item.value > 0);
  const COLORS = ["#3B82F6", "#10B981", "#FACC15"];
  const monthlyMap = {};
  filteredProjects.forEach((p) => {
    const date = new Date(p.createdAt);
    if (!isNaN(date)) {
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString("default", { month: "short" });

      if (monthlyMap[yearMonth]) {
        monthlyMap[yearMonth].count++;
      } else {
        monthlyMap[yearMonth] = { month: monthName, count: 1, key: yearMonth };
      }
    }
  });
  const monthlyData = Object.values(monthlyMap).sort((a, b) => a.key.localeCompare(b.key));
  const projectsFinal = filteredProjects.map((p) => {
    const rawCustomer = p.customer_ids?.[0];
    const customer =
      typeof rawCustomer === "object"
        ? rawCustomer
        : customers.find(
          (c) => String(c._id) === String(rawCustomer)
        );

    const clientName = clientMap[p.clientId] || clientMap[p.created_by] || "Unknown";
    const displayName = [ customer?.company_name, p.project_name,customer?.contact_name,]
      .filter(Boolean)
      .join(" - ") || "Unnamed Project";

    return {
      ...p,
      displayName,
      clientName,
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs font-medium" style={{ color: entry.color || entry.fill }}>
              {`${entry.name} : ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const statCards = [
    {
      title: "Total Clients",
      value: stats.totalClients,
      icon: Users,
      color: "bg-blue-500",
      trend: "+5% this month",
      description: "Registered in system",
    },
    {
      title: "Total Projects",
      value: stats.totalProjects,
      icon: FolderKanban,
      color: "bg-green-500",
      trend: "+8% growth",
      description: "Across all clients",
    },
    {
      title: "Active Projects",
      value: stats.activeProjects,
      icon: Clock,
      color: "bg-orange-500",
      trend: "In progress",
      description: "Running projects",
    },
    {
      title: "Completed Projects",
      value: stats.completedProjects,
      icon: CheckCircle,
      color: "bg-emerald-500",
      trend: "Delivered",
      description: "Finished projects",
    },
    {
      title: "Pending",
      value: stats.pendingProjects,
      icon: Package,
      color: "bg-yellow-500",
      trend: "Awaiting action",
      description: "Pending approval",
    },
  ];

  const projectsWithClient = filteredProjects.map((p) => ({
    ...p,
    clientName: clientMap[p.clientId] || clientMap[p.created_by] || "Unknown",
  }));

  return (
    <div className="min-h-screen w-full bg-gray50-temp">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl md:text-3xl font-extrabold text-gray-900temp">
          Super Admin Dashboard
        </h1>
        <p className="text-gray-600temp">Overall system overview</p>
      </div>

      <div className="mb-6">
        <label className="block text-gray-700temp font-medium mb-2">
          Filter by Client Project
        </label>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg p-2 py-2"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>
              {c.firstName && c.lastName
                ? `${c.firstName} ${c.lastName}`
                : c.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {statCards.map((stat, i) => (
          <Card
            key={i}
            className="relative overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            <div
              className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${stat.color} rounded-full opacity-10`}
            />

            <CardHeader className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500temp">{stat.title}</p>
                  <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-gray-400temp mt-1">{stat.description}</p>
                </div>

                <div className={`p-3 rounded-xl ${stat.color} bg-opacity-20`}>
                  <stat.icon
                    className={`w-6 h-6 ${stat.color.replace("bg-", "text-")}`}
                  />
                </div>
              </div>

              <div className="flex items-center mt-4 text-sm">
                <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                <span className="text-green-600 font-medium">{stat.trend}</span>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <Card className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-gray-200 dark:border-gray-700 overflow-visible">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Project Status Overview</h2>

          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={filteredPieData}
                dataKey="value"
                nameKey="name"
                outerRadius={isMobile ? 90 : 110}
                innerRadius={isMobile ? 50 : 60}
                labelLine={false}
                label={isMobile ? false : ({ name, value }) => `${name} (${value})`}
              >
                {filteredPieData?.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip content={<CustomTooltip />} />

              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: "14px" }}
                formatter={(value) => {
                  const item = filteredPieData.find(d => d.name === value);
                  return item?.value > 0
                    ? `${value} – ${item.value} projects`
                    : null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {filteredPieData?.length === 0 && (
            <div className="text-center text-gray-400temp mt-6">
              No project data available
            </div>
          )}
        </Card>


        <Card className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Projects Per Month</h2>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
              <XAxis
                dataKey="month"
                tick={{ fill: 'currentColor' }}
                className="text-gray-500 dark:text-gray-400 text-xs"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'currentColor' }}
                className="text-gray-500 dark:text-gray-400 text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="table-listrow-divstyle p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-6">Recent Projects</h2>
        <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <Thead className="bg-gray-100 dark:bg-gray-900 dark:bg-[#111827]">
            <Tr>
              <Th className="px-4 py-2 text-left text-sm font-medium text-gray-700temp">Project</Th>
              <Th className="px-4 py-2 text-left text-sm font-medium text-gray-700temp">Client</Th>
              <Th className="px-4 py-2 text-left text-sm font-medium text-gray-700temp">Status</Th>
              <Th className="px-4 py-2 text-left text-sm font-medium text-gray-700temp">Created At</Th>
            </Tr>
          </Thead>

          <Tbody className="table-listrow-divstyle divide-y divide-gray-200 dark:divide-gray-700">
            {projectsFinal.slice(0, 6).map((p, index) => (
              <Tr key={p._id} className={`hover:bg-gray50-temp ${index % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white dark:bg-[#303a42] md:dark:bg-[#1f2937]"}`}>
                <Td className="px-4 py-3 align-middle">{p.displayName}</Td>
                <Td className="px-4 py-3 align-middle">{p.clientName}</Td>
                <Td className="px-4 py-3 align-middle">
                  <span className="inline-block px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700temp text-xs text-center">
                    {p.status.replace("_", " ")}
                  </span>
                </Td>
                <Td className="px-4 py-3 align-middle">
                  {formatDateUTC(p.createdAt)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

    </div>
  );
}
