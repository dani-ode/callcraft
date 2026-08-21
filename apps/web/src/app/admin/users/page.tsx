"use client";

import { useState, useEffect } from "react";
import { Users, Plus, CheckCircle2, Lock, Fingerprint, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

export default function AdminUsersPage() {
  const { user, adminSession } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Developer");

  useEffect(() => {
    // Dynamically build user list starting from active logged-in sessions
    const initialUsers: UserRecord[] = [];

    if (adminSession) {
      initialUsers.push({
        id: adminSession.id,
        name: adminSession.name,
        email: adminSession.email,
        role: adminSession.role || "Super Admin",
        status: "Active Session",
        lastLogin: "Just Now",
      });
    }

    if (user && user.id !== adminSession?.id) {
      initialUsers.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "Developer",
        status: "Active User",
        lastLogin: "Recently Active",
      });
    }

    // Default system accounts if no session exists yet
    if (initialUsers.length === 0) {
      initialUsers.push(
        {
          id: `usr_${Math.random().toString(36).substring(2, 10)}`,
          name: "Callcraft Developer",
          email: "dev@callcraft.io",
          role: "Developer",
          status: "Active",
          lastLogin: "Online",
        },
        {
          id: `usr_${Math.random().toString(36).substring(2, 10)}`,
          name: "Security Lead Auditor",
          email: "security@company.io",
          role: "Super Admin",
          status: "Active",
          lastLogin: "10 mins ago",
        }
      );
    }

    setUsers(initialUsers);
  }, [user, adminSession]);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    const created: UserRecord = {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      status: "Invited",
      lastLogin: "Pending Acceptance",
    };

    setUsers([created, ...users]);
    setNewUserName("");
    setNewUserEmail("");
    setShowInviteModal(false);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            <span>User Accounts & RBAC Permissions</span>
          </h1>
          <p className="text-xs text-slate-400">Manage user access scopes, security roles, and user identity credentials</p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Invite New User</span>
        </button>
      </div>

      {/* User Accounts Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-100">Registered Platform Users</h2>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user name, email or ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800 bg-slate-900/40">
              <tr>
                <th className="py-2.5 px-3">User Name & Email</th>
                <th className="py-2.5 px-3">User ID</th>
                <th className="py-2.5 px-3">Assigned Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/30 transition-colors">
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-200">{u.name}</p>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-amber-300 flex items-center gap-1.5 pt-4">
                    <Fingerprint className="w-3.5 h-3.5 text-amber-400" />
                    <span>{u.id}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-semibold">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{u.lastLogin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>Invite New User Account</span>
            </h3>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Budi Santoso"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="budi@company.id"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Assign RBAC Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="Developer">Developer</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Finance Viewer">Finance Viewer</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400 hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-600/20"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
