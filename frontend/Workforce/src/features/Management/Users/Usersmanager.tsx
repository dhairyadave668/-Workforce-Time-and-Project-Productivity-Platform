// src/features/Management/Users/Usersmanager.tsx
import { useReducer, useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import MainLayout from "../../../shared/components/layout/MainLayout";
import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";
import type { User } from "../types/userTypes";
import { fetchUsers, deleteUser } from "../api/userApi";

const USERS_PER_PAGE = 10;

type PageState = {
  currentPage: number;
  searchQuery: string;
  selectedRole: string;
};

type PageAction =
  | { type: "SET_PAGE"; payload: number }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_SELECTED_ROLE"; payload: string }
  | { type: "CLEAR_FILTERS" };

const pageReducer = (state: PageState, action: PageAction): PageState => {
  switch (action.type) {
    case "SET_PAGE":
      return { ...state, currentPage: action.payload };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload, currentPage: 1 };
    case "SET_SELECTED_ROLE":
      return { ...state, selectedRole: action.payload, currentPage: 1 };
    case "CLEAR_FILTERS":
      return { ...state, searchQuery: "", selectedRole: "all", currentPage: 1 };
    default:
      return state;
  }
};

// Skeleton Components
const DesktopTableSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex-1 flex flex-col">
    <div className="overflow-y-auto flex-1">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
          <tr>
            <th className="px-5 py-3.5 text-left">Name</th>
            <th className="px-5 py-3.5 text-left">Email</th>
            <th className="px-5 py-3.5 text-left">Role</th>
            <th className="px-5 py-3.5 text-left">Joined</th>
            <th className="px-5 py-3.5 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {Array.from({ length: USERS_PER_PAGE }).map((_, index) => (
            <tr key={index} className="animate-pulse">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="h-4 bg-gray-200 rounded w-48" />
              </td>
              <td className="px-5 py-4">
                <div className="h-6 bg-gray-200 rounded-full w-16" />
              </td>
              <td className="px-5 py-4">
                <div className="h-4 bg-gray-200 rounded w-24" />
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-7 h-7 bg-gray-200 rounded-lg" />
                  <div className="w-7 h-7 bg-gray-200 rounded-lg" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const MobileCardSkeleton = () => (
  <div className="flex flex-col gap-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-3 animate-pulse">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gray-200" />
            <div className="h-4 bg-gray-200 rounded w-28" />
          </div>
          <div className="h-6 bg-gray-200 rounded-full w-16" />
        </div>
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 border">
          <div className="h-3 bg-gray-200 rounded w-32" />
          <div className="h-3 bg-gray-200 rounded w-20" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-8 bg-gray-200 rounded-xl" />
          <div className="flex-1 h-8 bg-gray-200 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

export default function UserManagement() {
  const queryClient = useQueryClient();

  const [openModal, setOpenModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [pageState, dispatch] = useReducer(pageReducer, {
    currentPage: 1,
    searchQuery: "",
    selectedRole: "all",
  });

  const { currentPage, searchQuery, selectedRole } = pageState;

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 640);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // ── Fetch users (no msal dependency) ──
  const { data: users = [], isLoading } = useQuery<User[], Error>({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  // ── Delete mutation ──
  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (id: string) => deleteUser(id),
    onMutate: () => toast.loading("Deleting user..."),
    onSuccess: () => {
      toast.dismiss();
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast.dismiss();
      toast.error(err.message || "Failed to delete user ❌");
    },
  });

  const confirmDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
      setUserToDelete(null);
    }
  };

  // Filter & search
  const filteredUsers = (() => {
    let list = [...users];
    if (selectedRole !== "all") {
      list = list.filter((u) => u.role === selectedRole);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    return list;
  })();

  const sortedUsers = [...filteredUsers].sort(
    (a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime()
  );

  const totalPages = Math.ceil(sortedUsers.length / USERS_PER_PAGE);
  const paginatedUsers = (() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return sortedUsers.slice(start, start + USERS_PER_PAGE);
  })();

  const hasActiveFilters = searchQuery !== "" || selectedRole !== "all";

  const roleBadge = (role: string) =>
    role === "Admin"
      ? "bg-purple-50 text-purple-700 border-purple-100"
      : "bg-blue-50 text-blue-700 border-blue-100";

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="h-full overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-4 md:py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
              <div className="h-9 bg-gray-200 rounded-xl w-24 animate-pulse" />
            </div>
            <div className="hidden sm:block"><DesktopTableSkeleton /></div>
            <div className="sm:hidden"><MobileCardSkeleton /></div>
            <div className="bg-white border rounded-xl px-4 py-3 shadow-md mt-4">
              <div className="hidden sm:flex items-center justify-between gap-3">
                <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
                <div className="flex items-center gap-2">
                  <div className="w-16 h-8 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="w-16 h-8 bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:hidden">
                <div className="h-4 bg-gray-200 rounded w-32 mx-auto animate-pulse" />
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex-1 h-10 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="flex-1 h-10 bg-gray-200 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Main UI
  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        <div className="px-4 sm:px-6 lg:px-8 py-4 md:py-6 flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <p className="text-gray-500 text-sm">Manage system users and permissions</p>
            <button
              onClick={() => setOpenModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition text-sm font-medium shadow-sm whitespace-nowrap"
            >
              <Plus size={15} />
              Add User
            </button>
          </div>

          {/* Desktop Table */}
          <div className={`${isMobile ? "hidden" : "flex flex-col flex-1 min-h-0"}`}>
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3.5 text-left">Name</th>
                      <th className="px-5 py-3.5 text-left">Email</th>
                      <th className="px-5 py-3.5 text-left">Role</th>
                      <th className="px-5 py-3.5 text-left">Joined</th>
                      <th className="px-5 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
                              {user.name[0]?.toUpperCase() || "U"}
                            </div>
                            <span className="font-medium text-gray-800 truncate">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-600 truncate">{user.email}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleBadge(user.role)}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                            {user.role}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                          {new Date(user.createdOn).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEditUser(user)}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                              title="Edit user"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setUserToDelete(user)}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginatedUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-16 text-center text-gray-400 text-sm">
                          {hasActiveFilters ? (
                            <div className="flex flex-col items-center gap-2">
                              <p>No users match your filters.</p>
                              <button
                                onClick={() => dispatch({ type: "CLEAR_FILTERS" })}
                                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                              >
                                Clear all filters
                              </button>
                            </div>
                          ) : (
                            "No users found."
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination (Desktop) */}
            {sortedUsers.length > 0 && (
              <div className="shrink-0 mt-4">
                <div className="bg-white border rounded-2xl shadow-sm px-4 py-3">
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          dispatch({ type: "SET_PAGE", payload: Math.max(currentPage - 1, 1) })
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50 text-sm"
                      >
                        Prev
                      </button>

                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;
                        return (
                          <button
                            key={i}
                            onClick={() => dispatch({ type: "SET_PAGE", payload: pageNum })}
                            className={`px-3 py-1 rounded-lg text-sm ${
                              currentPage === pageNum
                                ? "bg-indigo-600 text-white"
                                : "border hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <span className="px-1">...</span>
                          <button
                            onClick={() =>
                              dispatch({ type: "SET_PAGE", payload: totalPages })
                            }
                            className="px-3 py-1 rounded-lg text-sm border hover:bg-gray-50"
                          >
                            {totalPages}
                          </button>
                        </>
                      )}

                      <button
                        onClick={() =>
                          dispatch({
                            type: "SET_PAGE",
                            payload: Math.min(currentPage + 1, totalPages),
                          })
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50 text-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className={`${isMobile ? "flex-1 flex flex-col min-h-0" : "hidden"}`}>
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-3">
                {paginatedUsers.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm">
                    {hasActiveFilters ? (
                      <div className="text-center">
                        <p>No users match your filters.</p>
                        <button
                          onClick={() => dispatch({ type: "CLEAR_FILTERS" })}
                          className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                          Clear all filters
                        </button>
                      </div>
                    ) : (
                      "No users found."
                    )}
                  </div>
                )}
                {paginatedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                          {user.name[0]?.toUpperCase() || "U"}
                        </div>
                        <p className="font-semibold text-gray-800 text-sm truncate">
                          {user.name}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${roleBadge(user.role)}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        {user.role}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 border">
                      <span className="truncate">{user.email}</span>
                      <span className="text-gray-400">
                        Joined: {new Date(user.createdOn).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditUser(user)}
                        className="flex items-center justify-center gap-1.5 flex-1 py-2 border rounded-xl text-xs font-medium text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="flex items-center justify-center gap-1.5 flex-1 py-2 border rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-200 transition"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination (Mobile) */}
            {sortedUsers.length > 0 && (
              <div className="shrink-0 mt-4">
                <div className="bg-white border rounded-3xl px-4 py-3 shadow-md">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => dispatch({ type: "SET_PAGE", payload: i + 1 })}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === i + 1
                              ? "bg-indigo-600 text-white"
                              : "border hover:bg-gray-50 text-gray-600"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      {totalPages > 10 && <span className="text-gray-400 text-xs">...</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() =>
                          dispatch({ type: "SET_PAGE", payload: Math.max(currentPage - 1, 1) })
                        }
                        disabled={currentPage === 1}
                        className="flex-1 py-2 border rounded-xl text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"
                      >
                        ← Prev
                      </button>
                      <button
                        onClick={() =>
                          dispatch({
                            type: "SET_PAGE",
                            payload: Math.min(currentPage + 1, totalPages),
                          })
                        }
                        disabled={currentPage === totalPages}
                        className="flex-1 py-2 border rounded-xl text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {openModal && <AddUserModal close={() => setOpenModal(false)} />}
      {editUser && <EditUserModal user={editUser} close={() => setEditUser(null)} />}

      {/* Delete confirmation modal */}
      {userToDelete && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => setUserToDelete(null)}
        >
          <div className="bg-white w-full max-w-sm rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-2">Delete User</h2>
            <p className="text-gray-600 mb-1">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-800">{userToDelete.name}</span>?
            </p>
            <p className="text-xs text-gray-400 mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}