import { FormEvent, useEffect, useState } from "react";
import Avatar from "./Avatar";
import { apiFetch } from "../utils/api";
import { formatDateTime, formatGoal } from "../utils/display";

type GroupMember = {
  id: number;
  name: string;
  avatarUrl?: string | null;
  role?: string | null;
};

type GroupActivity = {
  actionType: string;
  metadata?: string | null;
  createdAt: string;
};

type Group = {
  id: number;
  name: string;
  description?: string | null;
  goal: string;
  inviteCode: string;
  maxMembers: number;
  members?: GroupMember[];
  recentActivity?: GroupActivity[];
};

const initialCreateForm = {
  name: "",
  goal: "general_fitness",
  description: "",
  maxMembers: 6,
};

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [createForm, setCreateForm] = useState(initialCreateForm);

  async function loadGroups() {
    const response = await apiFetch("/api/groups/my-groups");
    if (!response.ok) {
      throw new Error("Failed to load groups");
    }

    setGroups(await response.json());
  }

  useEffect(() => {
    loadGroups()
      .catch(() => setMessage("Could not load your groups right now."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await apiFetch("/api/groups/create", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Could not create this group.");
        return;
      }

      setCreateForm(initialCreateForm);
      setMessage("Group created.");
      await loadGroups();
    } catch {
      setMessage("Could not create this group.");
    }
  }

  async function handleJoinGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await apiFetch("/api/groups/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode: joinCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Could not join this group.");
        return;
      }

      setJoinCode("");
      setMessage("Joined group.");
      await loadGroups();
    } catch {
      setMessage("Could not join this group.");
    }
  }

  if (loading) {
    return <div className="page-section">Loading your groups...</div>;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Groups</span>
          <h1>Train with a focused crew.</h1>
          <p>Create a small accountability group, invite matched partners, or join with an invite code.</p>
        </div>
      </section>

      {message && (
        <div className={`feedback ${message.toLowerCase().includes("could not") ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <section className="two-column">
        <form className="card form-card" onSubmit={handleCreateGroup}>
          <span className="eyebrow">Create group</span>
          <div className="form-grid">
            <label>
              <span>Name</span>
              <input
                value={createForm.name}
                onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                placeholder="Morning strength crew"
                required
              />
            </label>
            <label>
              <span>Goal</span>
              <select
                value={createForm.goal}
                onChange={(event) => setCreateForm({ ...createForm, goal: event.target.value })}
              >
                <option value="general_fitness">General fitness</option>
                <option value="muscle_gain">Muscle gain</option>
                <option value="fat_loss">Fat loss</option>
              </select>
            </label>
            <label>
              <span>Max members</span>
              <input
                type="number"
                min={2}
                max={6}
                value={createForm.maxMembers}
                onChange={(event) =>
                  setCreateForm({ ...createForm, maxMembers: Number(event.target.value) })
                }
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                value={createForm.description}
                onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })}
                placeholder="What rhythm should this group keep?"
              />
            </label>
          </div>
          <button className="btn btn-primary" type="submit">
            Create Group
          </button>
        </form>

        <form className="card form-card" onSubmit={handleJoinGroup}>
          <span className="eyebrow">Join group</span>
          <label>
            <span>Invite code</span>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="AB12CD34"
              required
            />
          </label>
          <button className="btn btn-secondary" type="submit">
            Join Group
          </button>
        </form>
      </section>

      {groups.length === 0 ? (
        <section className="card empty-state">
          <h2>No groups yet</h2>
          <p>Create a group or use an invite code to start tracking progress with others.</p>
        </section>
      ) : (
        <section className="grid-list">
          {groups.map((group) => (
            <article key={group.id} className="card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">{formatGoal(group.goal)}</span>
                  <h2>{group.name}</h2>
                  <p>{group.description || "No description yet."}</p>
                </div>
                <span className="badge">Code {group.inviteCode}</span>
              </div>

              <div className="chip-row">
                <span className="chip">{group.members?.length ?? 0}/{group.maxMembers} members</span>
              </div>

              <div className="space-y-3">
                {(group.members ?? []).map((member) => (
                  <div key={member.id} className="match-headline">
                    <Avatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />
                    <div>
                      <strong>{member.name}</strong>
                      <p className="muted">{member.role || "member"}</p>
                    </div>
                  </div>
                ))}
              </div>

              {(group.recentActivity ?? []).length > 0 && (
                <div className="subtle-card">
                  <strong>Recent activity</strong>
                  {(group.recentActivity ?? []).slice(0, 3).map((activity) => (
                    <p key={`${activity.actionType}-${activity.createdAt}`} className="muted">
                      {activity.actionType} / {formatDateTime(activity.createdAt)}
                    </p>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
