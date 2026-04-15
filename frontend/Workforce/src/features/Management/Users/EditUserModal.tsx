// src/features/user/components/EditUserModal.tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { updateUserRole } from "../api/userApi";
import type { User } from "../types/userTypes";

type Props = {
  user: User;
  close: () => void;
};

export default function EditUserModal({ user, close }: Props) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState(user.role);

  const updateMutation = useMutation({
    mutationFn: () => updateUserRole(user.id, role),
    onSuccess: () => {
      toast.success("User role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      close();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update user ❌");
    },
  });

  return (
    <div
      className="fixed inset-0 bg-black/40 flex justify-center items-end sm:items-center z-50 px-0 sm:px-4"
      onClick={close}
    >
      <div
        className="bg-white w-full sm:w-96 rounded-t-2xl sm:rounded-xl p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold">Edit User</h2>
          <button
            onClick={close}
            className="text-gray-500 hover:text-black text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Name */}
        <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
        <input
          value={user.name}
          disabled
          className="w-full border rounded-lg px-3 py-2 mb-3 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
        />

        {/* Email */}
        <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
        <input
          value={user.email}
          disabled
          className="w-full border rounded-lg px-3 py-2 mb-3 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
        />

        {/* Role */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-600 block mb-2">Role</label>
          <Select value={role} onValueChange={(value) => setRole(value)}>
            <SelectTrigger className="w-full h-11 px-4 rounded-xl border border-gray-300 bg-white text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition">
              <SelectValue placeholder="Select Role" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl border bg-white p-1 max-h-40 overflow-y-auto">
              <SelectItem value="Employee" className="cursor-pointer text-sm hover:bg-indigo-50 focus:bg-indigo-100 rounded-lg px-3 py-2">
                Employee
              </SelectItem>
              <SelectItem value="Admin" className="cursor-pointer text-sm hover:bg-indigo-50 focus:bg-indigo-100 rounded-lg px-3 py-2">
                Admin
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={close}
            className="flex-1 border rounded-lg py-2.5 text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}