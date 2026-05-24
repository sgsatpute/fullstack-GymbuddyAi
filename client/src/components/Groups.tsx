import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";

type Group = {
  id: number;
  name: string;
  description?: string | null;
  goal: string;
  inviteCode: string;
  members: Array<{ id: number; name: string; avatarUrl?: string | null; role: string }>;
  recentActivity: Array<{ actionType: string; createdAt: string }>;
};

export default function Groups() {
  const queryClient = useQueryClient();
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    goal: "muscle",
  });
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const response = await apiFetch("/api/groups/my-groups");
      return (await response.json()) as Group[];
    },
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      const response = await apiFetch("/api/groups/create", {
        method: "POST",
        body: JSON.stringify({
          ...createForm,
          maxMembers: 6,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Could not create group");
      }
      return response.json();
    },
    onSuccess: () => {
      setMessage("Group created.");
      setCreateForm({ name: "", description: "", goal: "muscle" });
      queryClient.invalidateQueries({ queryKey: ["groups"] }).catch(() => {});
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const joinGroup = useMutation({
    mutationFn: async () => {
      const response = await apiFetch("/api/groups/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Could not join group");
      }
      return response.json();
    },
    onSuccess: () => {
      setMessage("Joined group.");
      setInviteCode("");
      queryClient.invalidateQueries({ queryKey: ["groups"] }).catch(() => {});
    },
    onError: (error: Error) => setMessage(error.message),
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    createGroup.mutate();
  }

  function handleJoin(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    joinGroup.mutate();
  }

  const groups = groupsQuery.data ?? [];

  return (
    <div className="page-stack">
      <motion.section
        className="hero-panel"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <span className="eyebrow">Groups</span>
          <h1>Train with a small squad that keeps you accountable.</h1>
          <p>Use invite codes to build a tight crew, share momentum, and stack small challenges together.</p>
        </div>
        <div className="chip-row">
          <span className="chip">{groups.length} groups</span>
          <span className="chip">Max 6 members</span>
        </div>
      </motion.section>

      {message ? <div className="feedback">{message}</div> : null}

      <section className="two-column">
        <motion.form className="card form-card" onSubmit={handleCreate} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div>
            <span className="eyebrow">Create Group</span>
            <h2>Start a crew</h2>
          </div>
          <label className="field">
            <span>Name</span>
            <input value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea rows={3} value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label className="field">
            <span>Goal</span>
            <select value={createForm.goal} onChange={(event) => setCreateForm((current) => ({ ...current, goal: event.target.value }))}>
              <option value="muscle">Muscle</option>
              <option value="weight_loss">Weight loss</option>
              <option value="endurance">Endurance</option>
              <option value="flexibility">Flexibility</option>
            </select>
          </label>
          <button className="btn btn-primary" type="submit" disabled={createGroup.isPending}>
            {createGroup.isPending ? "Creating..." : "Create Group"}
          </button>
        </motion.form>

        <motion.form className="card form-card" onSubmit={handleJoin} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div>
            <span className="eyebrow">Join by Code</span>
            <h2>Enter an invite code</h2>
          </div>
          <label className="field">
            <span>Invite code</span>
            <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder="AB12CD34" />
          </label>
          <button className="btn btn-secondary" type="submit" disabled={joinGroup.isPending}>
            {joinGroup.isPending ? "Joining..." : "Join Group"}
          </button>
        </motion.form>
      </section>

      <section className="grid-list">
        {groupsQuery.isLoading ? (
          <div className="card">Loading your groups...</div>
        ) : groups.length === 0 ? (
          <div className="card">No groups yet. Create one or join with an invite code.</div>
        ) : (
          groups.map((group, index) => (
            <motion.article
              key={group.id}
              className="card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="section-head">
                <div>
                  <span className="eyebrow">{group.goal.replace("_", " ")}</span>
                  <h2>{group.name}</h2>
                </div>
                <span className="score-pill">{group.inviteCode}</span>
              </div>
              <p className="muted">{group.description || "A focused squad for consistent training."}</p>
              <div className="chip-row">
                {group.members.map((member) => (
                  <span key={member.id} className="chip">
                    {member.name}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {(group.recentActivity ?? []).slice(0, 3).map((activity, activityIndex) => (
                  <div key={`${group.id}-${activityIndex}`} className="subtle-card">
                    <strong className="text-sm">{activity.actionType.replace(/_/g, " ")}</strong>
                    <p className="tiny-muted mt-1">{new Date(activity.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </motion.article>
          ))
        )}
      </section>
    </div>
  );
}
