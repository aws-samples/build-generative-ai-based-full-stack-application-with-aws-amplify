import { Box, Link } from "@cloudscape-design/components";
import { Schema } from '../../amplify/data/resource';
// import { CSSProperties } from 'react';

interface CourseProps {
  course: Schema["Course"]["type"];
  activeCourse: Schema["Course"]["type"] | undefined;
  setActiveCourse: (course: Schema["Course"]["type"]) => void;
  setActiveClass: (classItem: Schema["Class"]["type"] | undefined) => void;
}

// const linkStyles: CSSProperties = {
//   display: 'block',
//   padding: '10px 16px',
//   borderRadius: '8px',
//   textDecoration: 'none',
//   whiteSpace: 'nowrap',
//   overflow: 'hidden',
//   textOverflow: 'ellipsis',
//   width: '100%',
//   boxSizing: 'border-box',
//   transition: 'all 0.2s ease',
//   cursor: 'pointer',
//   border: '1px solid transparent',
// };

const Course = ({ course, activeCourse, setActiveCourse, setActiveClass }: CourseProps) => {
  const isActive = activeCourse?.id === course.id;

  const handleCourseSelect = () => {
    setActiveCourse(course);
    setActiveClass(undefined);
  };

  return (
    <Box 
      margin={{ bottom: 'm' }}
      padding={{ horizontal: 'xs' }}
    >
      <Link
        onFollow={handleCourseSelect}
        variant={isActive ? "primary" : "secondary"}
        fontSize="body-m"
        // color={isActive ? "normal" : "inverted"}
        // style={{
        //   ...linkStyles,
        //   backgroundColor: isActive ? 'var(--color-background-layout-selected)' : 'transparent',
        //   borderColor: isActive ? 'var(--color-border-control-default)' : 'transparent',
        //   fontWeight: isActive ? 500 : 400,
        // }}
      >
        {course.name}
      </Link>
    </Box>
  );
};

export { Course };
