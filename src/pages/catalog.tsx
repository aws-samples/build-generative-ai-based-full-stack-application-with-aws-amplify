import { useEffect, useState } from "react";
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
  const [activeClass, setActiveClass] = useState<Schema["Class"]["type"]>();
  const [activeCourse, setActiveCourse] = useState<Schema["Course"]["type"]>();
  const [courses, setCourses] = useState<Array<Schema["Course"]["type"]>>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  
  const fetchCourse = async () => {
    const {data: items } = await client.models.Course.list();
    setCourses(items);
    if (!activeCourse && items.length > 0) {
      setActiveCourse(items[0]);
      setActiveTabId(items[0].id);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, []);

  const handleTabChange = (detail: { activeTabId: string }) => {
    const selectedCourse = courses.find(c => c.id === detail.activeTabId);
    if (selectedCourse) {
      setActiveCourse(selectedCourse);
      setActiveClass(undefined); // Reset active class when changing course
      setActiveTabId(detail.activeTabId);
    }
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
                  <Container>
                    {(activeClass && activeClass != null && activeClass.class_flag != null && activeClass.class_flag <= 0) ? (
                      <Class activeClass={activeClass} userName={props.user} userId={props.uid} />
                    ) : (
                      <ClassCatalog activeCourse={course} setActiveClass={setActiveClass} />
                    )}
                  </Container>
                )
              }))}
            />
          </SpaceBetween>
        </Container>
      }
    />
  );
}
