// src/features/user/components/AddUserModal.tsx
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ChevronDown, X } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { fetchEmployees, createUser } from "../api/userApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface Props {
  close: () => void;
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

export default function AddUserModal({ close }: Props) {
  const queryClient = useQueryClient();

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [role, setRole] = useState("Employee");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });

  const filteredEmployees = employees.filter((emp) =>
    `${emp.name} ${emp.email}`.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (employeeDropdownOpen && triggerRef.current) {
      setDropdownRect(triggerRef.current.getBoundingClientRect());
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [employeeDropdownOpen]);

  useEffect(() => {
    if (!employeeDropdownOpen) return;
    const update = () => {
      if (triggerRef.current) {
        setDropdownRect(triggerRef.current.getBoundingClientRect());
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [employeeDropdownOpen]);

  useEffect(() => {
    if (!employeeDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      const portal = document.getElementById("emp-dropdown-portal");
      if (
        triggerRef.current?.contains(e.target as Node) ||
        portal?.contains(e.target as Node)
      )
        return;
      setEmployeeDropdownOpen(false);
      setEmployeeSearch("");
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [employeeDropdownOpen]);

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEmployeeDropdownOpen(false);
    setEmployeeSearch("");
  };

  const addUserMutation = useMutation({
    mutationFn: () => {
      if (!selectedEmployee) throw new Error("Please select employee");
      return createUser({
        employeeId: selectedEmployee.id,
        name: selectedEmployee.name,
        email: selectedEmployee.email,
        role,
      });
    },
    onSuccess: () => {
      toast.success("User added successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      close();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add user ❌");
    },
  });

  const dropdownList = (
    <div className="border border-gray-200 rounded-xl shadow-lg bg-white overflow-hidden">
      <div className="p-2 border-b border-gray-100">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name or email..."
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
          />
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-3 text-sm text-gray-400 text-center">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-400 text-center">No employees found</div>
        ) : (
          filteredEmployees.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectEmployee(emp);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                ${selectedEmployee?.id === emp.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "hover:bg-gray-50 text-gray-700"}
              `}
            >
              <div className="font-medium">{emp.name}</div>
              <div className="text-xs text-gray-400">{emp.email}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 flex justify-center items-end sm:items-center z-50"
      onClick={close}
    >
      <div
        className="bg-white w-full sm:w-105 rounded-t-2xl sm:rounded-xl shadow-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4">
          <h2 className="text-xl font-semibold">Add New User</h2>
          <button onClick={close} className="text-gray-400 hover:text-black transition">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 flex flex-col gap-5">
          {/* Employee Select */}
          <div className={isMobile ? "relative" : ""}>
            <label className="text-sm font-medium text-gray-600 block mb-2">
              Select Employee *
            </label>

            <button
              ref={triggerRef}
              type="button"
              onClick={() => {
                setEmployeeDropdownOpen((prev) => !prev);
                if (employeeDropdownOpen) setEmployeeSearch("");
              }}
              className={`w-full border rounded-xl px-4 py-3 text-left flex justify-between items-center bg-white text-sm transition
                ${employeeDropdownOpen
                  ? "border-indigo-500 ring-2 ring-indigo-100"
                  : "border-gray-300 hover:border-gray-400"}
              `}
            >
              <span className={selectedEmployee ? "text-gray-800 truncate pr-2" : "text-gray-400"}>
                {selectedEmployee ? selectedEmployee.name : "Select Employee"}
              </span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-gray-400 transition-transform duration-200 ${employeeDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {selectedEmployee && !employeeDropdownOpen && (
              <p className="text-xs text-gray-400 mt-1 px-1">{selectedEmployee.email}</p>
            )}

            {isMobile && employeeDropdownOpen && <div className="mt-1 relative z-50">{dropdownList}</div>}
          </div>

          {/* Role */}
          <div className="relative z-10">
            <label className="text-sm font-medium text-gray-600 block mb-2">Role</label>
            <Select value={role} onValueChange={(value) => setRole(value)}>
              <SelectTrigger className="w-full h-11 px-4 rounded-xl border border-gray-300 bg-white text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border bg-white p-1 max-h-40 overflow-y-auto z-50">
                <SelectItem value="Employee" className="cursor-pointer text-sm hover:bg-indigo-50 focus:bg-indigo-100">
                  Employee
                </SelectItem>
                <SelectItem value="Admin" className="cursor-pointer text-sm hover:bg-indigo-50 focus:bg-indigo-100">
                  Admin
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 relative z-10">
            <button
              onClick={close}
              className="flex-1 border border-gray-300 rounded-xl py-3 text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => addUserMutation.mutate()}
              disabled={!selectedEmployee || addUserMutation.isPending}
              className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {addUserMutation.isPending ? "Adding..." : "Add User"}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop portal dropdown */}
      {!isMobile && employeeDropdownOpen && dropdownRect &&
        createPortal(
          <div
            id="emp-dropdown-portal"
            style={{
              position: "fixed",
              top: dropdownRect.bottom + 4,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 99999,
            }}
          >
            {dropdownList}
          </div>,
          document.body
        )}
    </div>
  );
}