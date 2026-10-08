import { useEffect, useState, useMemo } from "react";
import { fetchBids, fetchProjects, fetchTimeEntries } from "@/services/roleApi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, LabelList } from "recharts";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, } from "@/components/ui/select";
import localApi from "../../services/localApi";
import { formatDateUTC } from "../../utils/formatdate";
import { Info } from "lucide-react";
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const COLORS = {
  Award: "#A78BFA",
  Processing: "#FBBF24",
  Completed: "#10B981",
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const daysBetweenMinOne = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = (e - s) / (1000 * 60 * 60 * 24);
  return diff <= 0 ? 1 : Math.ceil(diff);
};

const TimeLineChart = ({ customers }) => {
  const [projects, setProjects] = useState([]);
  const [bids, setBids] = useState([]);
  const [projectHours, setProjectHours] = useState([]);

  const [projectFilter, setProjectFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const currentMonth = monthNames[new Date().getMonth()];
  const currentYear = new Date().getFullYear().toString();

  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [yearFilter, setYearFilter] = useState(currentYear);

  const [user] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "{}")
  );
  const [me, setMe] = useState({});


  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await localApi.getMe();
        setMe(res);
      } catch (error) {
        console.log(error);
      }
    };
    fetchMe();
  }, []);

  useEffect(() => {
    const getData = async () => {
      try {
        const [projectsRes, bidsRes, timeRes] = await Promise.all([
          fetchProjects(),
          fetchBids(),
          fetchTimeEntries(),
        ]);

        const projectsData = projectsRes.data || projectsRes;
        const allProjects = Array.isArray(projectsData) ? projectsData : (projectsData.data || []);

        const userProjects = allProjects.filter(
          (p) =>
            p.created_by === user?.id ||
            p.created_by === me?.created_by
        );

        setProjects(userProjects);
        setBids((bidsRes.data?.data || bidsRes.data) || []);
        setProjectHours(timeRes.data?.projectHours || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    if (user?.id || me?.created_by) {
      getData();
    }
  }, [me, user?.id]);

  const availableYears = useMemo(() => {
    return Array.from(
      new Set(
        projects
          .map(
            (p) =>
              p.completed_date ||
              p.actual_end_date ||
              p.estimated_start_date
          )
          .filter(Boolean)
          .map((d) => new Date(d).getFullYear().toString())
      )
    ).sort((a, b) => b - a);
  }, [projects]);

  const chartDataRaw = projects
    .map((p) => {
      const relatedBid = bids.find(
        (b) => b.project_id?._id === p._id
      );

      const rawCustomer = p.customer_ids?.[0];

      const customer =
        typeof rawCustomer === "object"
          ? rawCustomer
          : customers?.find(
            (c) =>
              String(c._id || c.id) === String(rawCustomer)
          );

      const displayName = [
        customer?.company_name,
        p.project_name,
        customer?.contact_name,
      ]
        .filter(Boolean)
        .join(" - ") || "Unnamed Project";

      const awarded = relatedBid?.reviewed_at;
      const processing = p.estimated_start_date;
      const completed = p.completed_date || p.actual_end_date;

      const awardDays =
        awarded && processing
          ? daysBetweenMinOne(awarded, processing)
          : awarded
            ? 1
            : 0;

      const processingDays =
        processing && completed
          ? daysBetweenMinOne(processing, completed)
          : processing
            ? 1
            : 0;

      const completedDays = completed ? 1 : 0;

      let stageData = { Award: 0, Processing: 0, Completed: 0 };

      if (p.status?.toLowerCase() === "awarded") {
        stageData.Award = awardDays;
      } else if (p.status?.toLowerCase() === "processing") {
        stageData.Award = awardDays;
        stageData.Processing = processingDays;
      } else if (p.status?.toLowerCase() === "completed") {
        stageData.Award = awardDays;
        stageData.Processing = processingDays;
        stageData.Completed = completedDays;
      }

      if (stageFilter) {
        Object.keys(stageData).forEach((key) => {
          if (key.toLowerCase() !== stageFilter.toLowerCase()) {
            stageData[key] = 0;
          }
        });
      }

      return {
        name: p.project_number || "",
        projectName: p.project_name,
        displayName,
        status: p.status,
        ...stageData,
        total:
          stageData.Award +
          stageData.Processing +
          stageData.Completed,
        __dates: { awarded, processing, completed },
        totalHours:
          projectHours.find((h) => h.projectId === p._id)
            ?.totalHours || 0,
      };
    })
    .filter((p) =>
      ["awarded", "processing", "completed"].includes(
        p.status?.toLowerCase()
      )
    );

  const timeFilteredData = chartDataRaw
    .filter((p) => {
      if (!monthFilter) return true;
      const date =
        p.__dates.completed ||
        p.__dates.processing ||
        p.__dates.awarded;
      return (
        monthNames[new Date(date).getMonth()] === monthFilter
      );
    })
    .filter((p) => {
      if (!yearFilter) return true;
      const date =
        p.__dates.completed ||
        p.__dates.processing ||
        p.__dates.awarded;
      return (
        new Date(date).getFullYear().toString() === yearFilter
      );
    });

  const chartData = timeFilteredData
    .filter((p) =>
      projectFilter ? p.name === projectFilter : true
    )
    .sort((a, b) => b.total - a.total);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0].payload;

    const fmtDate = (d) =>
      d ? formatDateUTC(d) : "-";

    const { awarded, processing, completed } =
      entry.__dates || {};

    const totalDays =
      awarded || processing
        ? daysBetweenMinOne(
          awarded || processing,
          completed || new Date()
        )
        : 0;

    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-md shadow-md border border-gray-200 dark:border-slate-700 text-sm max-w-[90vw] w-fit break-words">
        <div className="font-semibold mb-2 text-slate-900 dark:text-white max-w-[45vw] break-all line-clamp-2">
          {entry.displayName}{" "}
          <span className="text-xs">({entry.name})</span>
        </div>
        <div className="space-y-1 text-slate-700 dark:text-slate-200">
          <div>Status: <b>{entry.status}</b></div>
          <div>Awarded: {fmtDate(awarded)}</div>
          <div>Processing: {fmtDate(processing)}</div>
          <div>Completed: {fmtDate(completed)}</div>
          <hr />
          <div>Total Days: <b>{totalDays}</b></div>
          <div>Total Hours: <b>{entry.totalHours} hrs</b></div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h3 className="text-lg font-semibold text-gray-950 dark:text-white">Project Timeline</h3>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-xs">Timeline showing the number of days projects spent in Award, Processing, and Completed stages.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Award, processing, and completion days by project</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:flex">
          {/* Project */}
          <Select
            value={projectFilter || "all"}
            onValueChange={(v) =>
              setProjectFilter(v === "all" ? "" : v)
            }
          >
            <SelectTrigger className="w-full border-gray-200 bg-white shadow-sm md:w-[160px] dark:border-gray-700 dark:bg-gray-800">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {timeFilteredData.map((p) => (
                <SelectItem
                  key={p.name}
                  value={p.name}
                >
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stage */}
          <Select
            value={stageFilter || "all"}
            onValueChange={(v) =>
              setStageFilter(v === "all" ? "" : v)
            }
          >
            <SelectTrigger className="w-full border-gray-200 bg-white shadow-sm md:w-[140px] dark:border-gray-700 dark:bg-gray-800">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="Award">Award</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Month */}
          <Select
            value={monthFilter || "all"}
            onValueChange={(v) =>
              setMonthFilter(v === "all" ? "" : v)
            }
          >
            <SelectTrigger className="w-full border-gray-200 bg-white shadow-sm md:w-[150px] dark:border-gray-700 dark:bg-gray-800">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {monthNames.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year */}
          <Select
            value={yearFilter || "all"}
            onValueChange={(v) =>
              setYearFilter(v === "all" ? "" : v)
            }
          >
            <SelectTrigger className="w-full border-gray-200 bg-white shadow-sm md:w-[120px] dark:border-gray-700 dark:bg-gray-800">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="h-[360px] w-full overflow-x-auto">
        {chartData.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-gray-500 dark:text-gray-400">
            No data available
          </div>
        ) : (
          <div className="h-full min-w-[760px]"
            style={{
              minWidth: `${Math.max(chartData.length * 120, 760)}px`,
            }}
          >
            <ResponsiveContainer>
              <BarChart margin={{ top: 24, right: 18, left: 8, bottom: 30 }} data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={0}
                  textAnchor="middle"
                  height={40}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                />
                <YAxis
                  tickFormatter={(v) => `${v}d`}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  width={46}
                />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ paddingTop: 0 }}
                  iconType="square"
                />
                <Tooltip cursor={false} content={<CustomTooltip />} />
                <Bar dataKey="Award" stackId="a" fill={COLORS.Award} barSize={34} radius={[0, 0, 4, 4]}>
                  <LabelList dataKey="Award" position="center" formatter={(v) => (v ? `${v}d` : "")} fill="#ffffff" fontSize={12} fontWeight={700} />
                </Bar>
                <Bar
                  dataKey="Processing"
                  stackId="a"
                  fill={COLORS.Processing}
                  barSize={34}
                >
                  <LabelList dataKey="Processing" position="center" formatter={(v) => (v ? `${v}d` : "")} fill="#ffffff" fontSize={12} fontWeight={700} />
                </Bar>
                <Bar
                  dataKey="Completed"
                  stackId="a"
                  fill={COLORS.Completed}
                  barSize={34}
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList dataKey="Completed" position="center" formatter={(v) => (v ? `${v}d` : "")} fill="#ffffff" fontSize={12} fontWeight={700} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeLineChart;
