import { formatRelativeTime, formatFullDateTime } from "@/lib/utils";

interface RelativeTimeProps {
  date: string;
  className?: string;
}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  return (
    <time dateTime={date} title={formatFullDateTime(date)} className={className}>
      {formatRelativeTime(date)}
    </time>
  );
}
