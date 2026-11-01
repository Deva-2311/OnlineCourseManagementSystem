import { Course } from "@/types";

export const MOCK_COURSES: Course[] = [
  {
    id: "c1",
    title: "Full Stack Web Development",
    description: "Learn to build scalable web applications from scratch using React, Next.js, and Node.js.",
    instructorName: "Sarah Drasner",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=800&auto=format&fit=crop",
    category: "Web Development",
    rating: 4.8,
    studentsCount: 15420,
    durationHours: 45,
    level: "Beginner",
    price: 89.99,
    isFree: false,
    status: "PUBLISHED"
  },
  {
    id: "c2",
    title: "Machine Learning Fundamentals",
    description: "An introduction to machine learning concepts with Python and Scikit-learn.",
    instructorName: "Andrew Ng",
    thumbnail: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=800&auto=format&fit=crop",
    category: "Data Science",
    rating: 4.9,
    studentsCount: 32050,
    durationHours: 32,
    level: "Intermediate",
    price: 0,
    isFree: true,
    status: "PUBLISHED"
  },
  {
    id: "c3",
    title: "Cloud Computing with AWS",
    description: "Master the cloud with this comprehensive guide to Amazon Web Services.",
    instructorName: "Stephane Maarek",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
    category: "Cloud",
    rating: 4.7,
    studentsCount: 8900,
    durationHours: 25,
    level: "Advanced",
    price: 120.00,
    isFree: false,
    status: "PUBLISHED"
  },
  {
    id: "c4",
    title: "Data Structures and Algorithms",
    description: "Ace your coding interviews with deep dives into essential computer science concepts.",
    instructorName: "Colt Steele",
    thumbnail: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?q=80&w=800&auto=format&fit=crop",
    category: "Computer Science",
    rating: 4.6,
    studentsCount: 22100,
    durationHours: 50,
    level: "Beginner",
    price: 49.99,
    isFree: false,
    status: "PUBLISHED"
  }
];
