interface Props {
  title: string;
  courses: string[];
}

export default function CourseList({
  title,
  courses,
}: Props) {
  return (
    <div
      className="
        border
        rounded-xl
        p-4
      "
    >
      <h3
        className="
          font-semibold
          mb-3
        "
      >
        {title}
      </h3>

      <ul
        className="
          space-y-2
        "
      >
        {courses.map(
          (course) => (
            <li
              key={course}
              className="
                bg-muted
                p-2
                rounded
              "
            >
              {course}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}