import { Dumbbell } from "lucide-react";

interface ExerciseCardProps {
  name: string;
  sets: number;
  reps: number;
  description: string;
}

export default function ExerciseCard({ name, sets, reps, description }: ExerciseCardProps) {
  return (
    <article className="subtle-card flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{name}</h3>
        <span className="chip">
          {sets} sets x {reps} reps
        </span>
      </div>
      <p className="text-sm leading-6 text-white/80">{description}</p>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <Dumbbell size={12} />
        <span>Target Sets</span>
      </div>
    </article>
  );
}
