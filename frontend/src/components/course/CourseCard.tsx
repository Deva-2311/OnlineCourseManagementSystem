/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { Course } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, Users, ArrowRight } from "lucide-react";

export function CourseCard({ course }: { course: Course }) {
  const categoryName =
    typeof course.category === "object" && course.category !== null
      ? course.category.name
      : typeof course.category === "string"
      ? course.category
      : "General";

  const href = `/courses/${course.slug || course.id}`;
  const price = Number(course.price || 0);
  const isFree = course.isFree || price === 0;

  return (
    <Link href={href} className="group block h-full focus:outline-none focus:ring-2 focus:ring-primary rounded-xl">
      <Card className="flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border border-outline-variant/40 bg-surface-container-lowest">
        <div className="relative aspect-video overflow-hidden bg-surface-container">
          <img
            src={course.thumbnail || "/images/placeholder-course.jpg"}
            alt={course.title}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              // fallback to a clean SVG placeholder
              (e.currentTarget as HTMLImageElement).src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225' viewBox='0 0 400 225'%3E%3Crect width='400' height='225' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='16'%3EOnline Course%3C/text%3E%3C/svg%3E";
            }}
          />
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-surface/90 backdrop-blur-sm text-on-surface shadow-sm font-medium text-xs">
              {categoryName}
            </Badge>
          </div>
          {isFree && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-emerald-600 text-white font-semibold text-xs shadow-sm">
                FREE
              </Badge>
            </div>
          )}
        </div>

        <CardHeader className="p-4 pb-2 flex-none">
          <h3 className="font-semibold text-base leading-snug text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          <p className="text-xs text-on-surface-variant mt-1 line-clamp-1">
            {course.instructorName || "OCMS Faculty"}
          </p>
        </CardHeader>

        <CardContent className="p-4 pt-1 flex-grow">
          <div className="flex items-center gap-3 text-xs text-on-surface-variant mb-2">
            <div className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{(course.rating ?? 4.8).toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{(course.studentsCount ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{course.durationHours || course.estimatedDuration || 10}h</span>
            </div>
          </div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-outline">
            {course.level || "ALL LEVELS"}
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-2 flex items-center justify-between border-t border-surface-variant/30 mt-auto bg-surface-container-low/40">
          <div className="font-bold text-base text-primary">
            {isFree ? (
              <span className="text-emerald-600 font-semibold">Free Enrollment</span>
            ) : (
              <span>${price.toFixed(2)}</span>
            )}
          </div>
          <span className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
