import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Download, CalendarDays, ChevronDown, X, FileText } from "lucide-react";
import { format } from "date-fns";
import { formatDateUS, formatDateUTC } from "../../utils/formatdate";
import Swal from "sweetalert2";

export default function MaterialOrderAttachments({ attachments }) {
    const [search, setSearch] = useState("");
    const [userFilter, setUserFilter] = useState("all");
    const [dateRange, setDateRange] = useState({ from: null, to: null });
    const [dateOpen, setDateOpen] = useState(false);

    const uniqueUsers = useMemo(() => {
        return [...new Set(attachments.map(f => f.uploaded_by).filter(Boolean))];
    }, [attachments]);

    const filtered = useMemo(() => {
        return attachments.filter((file) => {

            if (file.file_name?.toLowerCase().includes("signature")) {
                return false;
            }

            if (search && !file.file_name?.toLowerCase().includes(search.toLowerCase())) {
                return false;
            }

            if (userFilter !== "all" && file.uploaded_by !== userFilter) {
                return false;
            }

            if (dateRange.from || dateRange.to) {
                const fileDate = new Date(file.createdAt);

                if (dateRange.from && fileDate < new Date(dateRange.from)) return false;
                if (dateRange.to && fileDate > new Date(dateRange.to)) return false;
            }

            return true;
        });
    }, [attachments, search, userFilter, dateRange]);

    const downloadFile = async (fileUrl, fileName) => {
        try {
            Swal.fire({
                title: 'Preparing Download...',
                text: 'Please wait',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
            });

            let actualUrl = fileUrl;
            if (actualUrl && actualUrl.includes('/uploads/')) {
                const uploadPath = actualUrl.substring(actualUrl.indexOf('/uploads/'));
                actualUrl = `${(import.meta.env.VITE_IMG || '').replace(/\/$/, '')}${uploadPath}`;
            }

            const response = await fetch(actualUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const extension = fileUrl.split('.').pop();
            const finalFileName = fileName.includes('.') ? fileName : `${fileName}.${extension}`;
            link.href = url;
            link.download = finalFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            Swal.fire({
                icon: 'success',
                title: 'Download Started!',
                text: `"${finalFileName}" is being downloaded`,
                timer: 2000,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Error downloading file:', error);
            Swal.fire({
                icon: 'error',
                title: 'Download Failed',
                text: 'There was an error downloading the file. Please try again.',
            });
        }
    };

    return (
        <Card className="mt-6">
            <CardHeader>
                <div className="flex flex-wrap items-center gap-2 justify-between">

                    <h2 className="font-bold">Attachments</h2>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">

                        <Select value={userFilter} onValueChange={setUserFilter}>
                            <SelectTrigger className="h-8 text-xs w-[140px]">
                                <SelectValue placeholder="Select User" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Select User</SelectItem>
                                {uniqueUsers.map(user => (
                                    <SelectItem key={user} value={user}>{user}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Popover open={dateOpen} onOpenChange={setDateOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`h-8 text-xs px-3 gap-1.5 border-gray-200 font-normal ${(dateRange.from || dateRange.to)
                                        ? "text-primary border-primary"
                                        : "text-gray-500"
                                        }`}
                                >
                                    <CalendarDays className="w-3.5 h-3.5" />

                                    <span className="max-w-[110px] truncate">
                                        {dateRange.from && dateRange.to
                                            ? `${formatDateUS(dateRange.from, "MMM d")} – ${formatDateUS(dateRange.to, "MMM d, yyyy")}`
                                            : dateRange.from
                                                ? `From ${formatDateUS(dateRange.from, "MMM d, yyyy")}`
                                                : dateRange.to
                                                    ? `To ${formatDateUS(dateRange.to, "MMM d, yyyy")}`
                                                    : "Date Range"}
                                    </span>

                                    <ChevronDown className="w-3 h-3 opacity-50 ml-auto" />
                                </Button>
                            </PopoverTrigger>

                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="range"
                                    selected={dateRange}
                                    onSelect={(range) =>
                                        setDateRange(range || { from: null, to: null })
                                    }
                                    numberOfMonths={2}
                                    initialFocus
                                />

                                {(dateRange.from || dateRange.to) && (
                                    <div className="flex justify-end px-4 pb-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-gray-500"
                                            onClick={() => {
                                                setDateRange({ from: null, to: null });
                                                setDateOpen(false);
                                            }}
                                        >
                                            <X className="w-3 h-3 mr-1" />
                                            Clear
                                        </Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>

                        <Input
                            placeholder="Search file..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-40 h-8 text-xs"
                        />
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <Table>
                    <Thead className="bg-gray-50 dark:bg-gray-800/50">
                        <Tr className="text-left font-semibold text-gray-600 dark:text-gray-300 text-sm py-1 px-6 border-b border-gray-100 dark:border-gray-800">
                            <Th>File Name</Th>
                            <Th>Uploaded By</Th>
                            <Th>Date</Th>
                            <Th>Action</Th>
                        </Tr>
                    </Thead>

                    <Tbody>
                        {filtered.length > 0 ? (
                            filtered.map((file, i) => (
                                <Tr
                                    key={i}
                                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 text-sm ${i % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-slate-800" : "bg-white dark:bg-slate-700"
                                        }`}
                                >
                                    <Td>{file.file_name}</Td>

                                    <Td>{file.uploaded_by || "N/A"}</Td>

                                    <Td>
                                        {file.createdAt
                                            ? formatDateUTC(file.createdAt)
                                            : "-"}
                                    </Td>

                                    <Td className="space-y-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                downloadFile(file.file_url, file.file_name)
                                            }
                                        >
                                            <Download className="w-4 h-4 mr-1" />
                                            Download
                                        </Button>
                                    </Td>
                                </Tr>
                            ))
                        ) : (
                            <Tr>
                                <Td
                                    colSpan={4}
                                    className="text-center py-6 text-gray-500"
                                >
                                    <FileText className="w-12 h-12 text-gray-400temp mx-auto mb-4" />
                                    No data found
                                </Td>
                            </Tr>
                        )}
                    </Tbody>
                </Table>
            </CardContent>
        </Card>
    );
}