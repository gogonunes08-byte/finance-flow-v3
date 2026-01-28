
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
    return (
        <div className="p-3 md:p-6 space-y-4 md:space-y-6">
            {/* Progress Bar Skeleton */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-24" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
            </div>

            {/* Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-32" />
                            </div>
                            <Skeleton className="h-10 w-10 rounded-lg" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>

            {/* Charts Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-80">
                    <Skeleton className="h-6 w-48 mb-6" />
                    <div className="flex justify-center items-center h-48">
                        <Skeleton className="h-40 w-40 rounded-full" />
                    </div>
                </div>
                <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-80">
                    <Skeleton className="h-6 w-48 mb-6" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-10 w-40" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex justify-between items-center">
                            <div className="flex gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                            <Skeleton className="h-4 w-20" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
