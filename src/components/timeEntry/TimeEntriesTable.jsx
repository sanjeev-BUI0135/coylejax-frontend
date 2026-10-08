import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Clock, Filter } from "lucide-react";
import { format, parse, addDays } from "date-fns";
import { UilPlusCircle, UilTrash, UilEdit } from "@iconscout/react-unicons";
import Pagination from "../shared/Pagination";
import HistoryTooltip from "@/pages/HistoryTooltip";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { formatDateUTC } from "@/utils/formatdate";

const TimeEntriesTable = ({
    title,
    entries,
    activeTab,
    currentEntries,
    totalPages,
    currentPage,
    onPageChange,
    itemsPerPage,
    handleItemsPerPageChange,
    showFilters,
    setShowFilters,
    filterEmployee,
    setFilterEmployee,
    filterProjectType,
    setFilterProjectType,
    filterProject,
    setFilterProject,
    filterDate,
    setFilterDate,
    filterDescription,
    setFilterDescription,
    clearFilters,
    usersMap,
    projects,
    getEmployeeName,
    getProjectDisplayName,
    calculateHours,
    canAdd,
    canUpdate,
    canDelete,
    showActions,
    hasEntryChanges,
    entryChangeHistory,
    handleEdit,
    handleDelete,
    setIsOpen,
    timeEntryPerms,
    isAdmin,
    user,
}) => {
    const filteredProjectsForDropdown = projects.filter(project => {
        return entries.some(entry =>
            entry.project_id === project._id ||
            entry.project_id === project.id
        );
    });
    return (
        <Card className="flex-1">
            <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between p-6">
                <div className="order-2 sm:order-1">
                    <CardTitle className="text-lg sm:text-xl font-bold">
                        {title}
                    </CardTitle>

                    <p className="text-xs sm:text-sm text-gray-400temp mt-1">
                        Manage time entries
                    </p>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2 w-full sm:w-auto justify-between">
                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9"
                    >
                        <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                        Filters
                    </Button>

                    {activeTab !== "allEntries" && canAdd &&
                        timeEntryPerms.widgets.MyTimeEntries?.add && (
                            <Button
                                onClick={() => setIsOpen(true)}
                                className="bg-blue-600 text-white"
                            >
                                <UilPlusCircle className="w-4 h-4 mr-1" />
                                Log Hours
                            </Button>
                        )}
                </div>
            </CardHeader>

            {/* FILTERS */}
            {showFilters && (
                <div className="px-4 sm:px-6 pb-4 border-b">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 mb-3">

                        {/* EMPLOYEE */}
                        <div>
                            <Label className="text-xs">Employee</Label>

                            <Select
                                value={filterEmployee}
                                onValueChange={setFilterEmployee}
                            >
                                <SelectTrigger className="h-8 text-xs sm:text-sm">
                                    <SelectValue placeholder="All employees" />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="all">
                                        All employees
                                    </SelectItem>

                                    {[...new Set(
                                        entries.map((e) =>
                                            getEmployeeName(e, usersMap)
                                        )
                                    )].map((name, index) => (
                                        <SelectItem key={index} value={name}>
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* PROJECT TYPE */}
                        <div>
                            <Label className="text-xs">Project Type</Label>

                            <Select
                                value={filterProjectType}
                                onValueChange={setFilterProjectType}
                            >
                                <SelectTrigger className="h-8 text-xs sm:text-sm">
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="all">
                                        All types
                                    </SelectItem>

                                    {[...new Set(
                                        filteredProjectsForDropdown.map((p) => p.project_type_name ||p.project_type)
                                    )].map((type, index) => (
                                        <SelectItem key={index} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* PROJECT */}
                        <div>
                            <Label className="text-xs">Project</Label>

                            <Select
                                value={filterProject}
                                onValueChange={setFilterProject}
                            >
                                <SelectTrigger className="h-8 text-xs sm:text-sm">
                                    <SelectValue placeholder="All projects" />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="all">
                                        All projects
                                    </SelectItem>

                                    {filteredProjectsForDropdown.map((project) => (
                                        <SelectItem
                                            key={project._id || project.id}
                                            value={project.project_name}
                                        >
                                            {getProjectDisplayName(project)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* DATE */}
                        <div>
                            <Label className="text-xs">Date</Label>

                            <CustomDatePicker
                                value={filterDate}
                                onChange={setFilterDate}
                                className="h-8 text-xs sm:text-sm"
                            />
                        </div>

                        {/* DESCRIPTION */}
                        <div>
                            <Label className="text-xs">
                                Work Description
                            </Label>

                            <Input
                                placeholder="Filter description..."
                                value={filterDescription}
                                onChange={(e) =>
                                    setFilterDescription(e.target.value)
                                }
                                className="h-8 text-xs sm:text-sm"
                            />
                        </div>

                        {/* CLEAR */}
                        <div className="flex items-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                className="h-8 w-full"
                            >
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <CardContent>
                {entries.length === 0 ? (
                    <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-gray-400temp mx-auto mb-4" />

                        <h3 className="text-lg font-medium text-gray-900temp">
                            No time entries yet
                        </h3>

                        <p className="text-gray-500temp mt-2">
                            No data found
                        </p>
                    </div>
                ) : (
                    <>
                        {/* DESKTOP */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Project Type</TableHead>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Worked</TableHead>
                                        <TableHead>Description</TableHead>

                                        {showActions && (
                                            <TableHead>Actions</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {currentEntries.map((entry) => {
                                        const project = projects.find(
                                            (p) =>
                                                p._id === entry.project_id ||
                                                p.id === entry.project_id
                                        );

                                        const workedHours =
                                            entry.total_hours ||
                                            calculateHours(
                                                entry.start_time,
                                                entry.end_time
                                            );

                                        return (
                                            <TableRow key={entry._id}>
                                                <TableCell>
                                                    {getEmployeeName(entry, usersMap)}
                                                </TableCell>

                                                <TableCell>
                                                    {project?.project_type_name ||
                                                        "Not specified"}
                                                </TableCell>

                                                <TableCell>
                                                    {project
                                                        ? getProjectDisplayName(project)
                                                        : "Unknown Project"}
                                                </TableCell>

                                                <TableCell>
                                                    {formatDateUTC(entry.date)}
                                                </TableCell>

                                                <TableCell>
                                                    {(() => {
                                                        const startTime = parse(
                                                            entry.start_time,
                                                            "HH:mm",
                                                            new Date()
                                                        );

                                                        let endTime = parse(
                                                            entry.end_time,
                                                            "HH:mm",
                                                            new Date()
                                                        );

                                                        if (endTime < startTime) {
                                                            endTime = addDays(endTime, 1);
                                                        }

                                                        return (
                                                            <>
                                                                {format(startTime, "h:mm a")} -{" "}
                                                                {format(endTime, "h:mm a")}
                                                                <span className="ml-1">
                                                                    ({workedHours.toFixed(1)} hrs)
                                                                </span>
                                                            </>
                                                        );
                                                    })()}
                                                </TableCell>

                                                <TableCell>
                                                    {entry.description}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2">

                                                        {entry.change_history?.length > 0 && (
                                                            <HistoryTooltip
                                                                entryId={entry._id}
                                                                changeHistory={entry.change_history}
                                                                entryDetails={{
                                                                    employeeName:
                                                                        getEmployeeName(
                                                                            entry,
                                                                            usersMap
                                                                        ),
                                                                }}
                                                            />
                                                        )}

                                                        {canUpdate &&
                                                            timeEntryPerms.widgets
                                                                .MyTimeEntries
                                                                ?.update && (
                                                                <button
                                                                    onClick={() =>
                                                                        handleEdit(entry)
                                                                    }
                                                                >
                                                                    <UilEdit size="16" />
                                                                </button>
                                                            )}

                                                        {canDelete &&
                                                            timeEntryPerms.widgets
                                                                .MyTimeEntries
                                                                ?.delete && (
                                                                <button
                                                                    onClick={() =>
                                                                        handleDelete(
                                                                            entry._id
                                                                        )
                                                                    }
                                                                >
                                                                    <UilTrash size="16" />
                                                                </button>
                                                            )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {/* PAGINATION */}
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={entries.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={onPageChange}
                                onItemsPerPageChange={handleItemsPerPageChange}
                            />
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default TimeEntriesTable;