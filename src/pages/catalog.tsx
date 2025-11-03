import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container, 
  SpaceBetween,
  Tabs,
  Header
} from "@cloudscape-design/components";

// component
import { Class } from "../components/Class.tsx";
import { ClassCatalog } from "../components/ClassCatalog.tsx";

// api
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../amplify/data/resource';
import BaseAppLayout from "../components/base-app-layout";

const client = generateClient<Schema>();

export default function Catalog(props: any) {
  const { courseId, classId } = useParams();
  const navigate = useNavigate();
  
  const [activeClass, setActiveClass] = useState<Schema["Class"]["type"]>();
  const [activeCourse, setActiveCourse] = useState<Schema["Course"]["type"]>();
  const [courses, setCourses] = useState<Array<Schema["Course"]["type"]>>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  
  const fetchCourse = async () => {
    const {data: items } = await client.models.Course.list();
    setCourses(items);
    
    // URL에 courseId가 있으면 해당 코스를 활성화
    if (courseId && items.length > 0) {
      const selectedCourse = items.find(c => c.id === courseId);
      if (selectedCourse) {
        setActiveCourse(selectedCourse);
        setActiveTabId(selectedCourse.id);
      }
    } else if (!activeCourse && items.length > 0) {
      setActiveCourse(items[0]);
      setActiveTabId(items[0].id);
    }
  };

  const fetchClass = async () => {
    if (classId) {
      try {
        const { data: classData } = await client.models.Class.get({ id: classId });
        if (classData) {
          setActiveClass(classData);
        }
      } catch (error) {
        console.error('Error fetching class:', error);
      }
    }
  };

  useEffect(() => {
    fetchCourse();
  }, []);

  useEffect(() => {
    if (classId) {
      fetchClass();
    } else {
      setActiveClass(undefined);
    }
  }, [classId]);

  const handleTabChange = (detail: { activeTabId: string }) => {
    const selectedCourse = courses.find(c => c.id === detail.activeTabId);
    if (selectedCourse) {
      setActiveCourse(selectedCourse);
      setActiveClass(undefined);
      setActiveTabId(detail.activeTabId);
      // URL 업데이트
      navigate(`/catalog/course/${detail.activeTabId}`);
    }
  };

  const handleClassSelect = (selectedClass: Schema["Class"]["type"]) => {
    setActiveClass(selectedClass);
    // URL 업데이트
    navigate(`/catalog/course/${activeCourse?.id}/class/${selectedClass.id}`);
  };

  return (
    <BaseAppLayout
      content={
        <Container>
          <SpaceBetween size="l">
            <Header
              variant="h1"
              description="Browse our comprehensive learning catalog by category"
            >
              Learning Catalog
            </Header>
            
            <Tabs
              activeTabId={activeTabId}
              onChange={({ detail }) => handleTabChange(detail)}
              tabs={courses.map(course => ({
                id: course.id,
                label: course.name || "Unknown Course",
                content: (
                  (activeClass && activeClass != null && activeClass.class_flag != null && activeClass.class_flag <= 0) ? (
                    <Class activeClass={activeClass} userName={props.user} userId={props.uid} />
                  ) : (
                    <ClassCatalog activeCourse={course} setActiveClass={handleClassSelect} />
                  )
                )
              }))}
            />
          </SpaceBetween>
        </Container>
      }
    />
  );
}
