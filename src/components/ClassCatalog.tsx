import { useEffect, useState } from "react";
import {
  Cards, Link, StatusIndicator, Box, Pagination, Header
} from "@cloudscape-design/components";

// api
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

const ClassCatalog = ({
  activeCourse,
  setActiveClass,
}: { 
  activeCourse: any, 
  setActiveClass: any 
}) => {
  const [classes, setClasses] = useState<Array<Schema["Class"]["type"]>>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4; 

  useEffect(() => {
    const fetchClasses = async () => {
      if (!activeCourse) return;

      setLoading(true);
      const classes_return = await fetchClass(activeCourse);
      setClasses(classes_return || []);
      setLoading(false);
      setCurrentPage(1); 
    };

    fetchClasses();
  }, [activeCourse]);

  const getCurrentPageItems = () => {
    const sortedClasses = classes.sort((a, b) => (a.class_flag ?? 0) - (b.class_flag ?? 0));
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedClasses.slice(startIndex, startIndex + itemsPerPage);
  };

  const pagesCount = Math.ceil(classes.length / itemsPerPage);

  return (
    <Cards
      ariaLabels={{
        itemSelectionLabel: (_, n) => `select ${n.name}`,
        selectionGroupLabel: "Item selection"
      }}
      cardDefinition={{
        header: item => (
          <Link
            fontSize="heading-m"
            href={item.id || '#'}
            onFollow={(e) => {
                e.preventDefault();
                setActiveClass(classes.find(element => element.id === e.detail.href));
              }
            }
          >
            {item.name}
          </Link>
        ),
        sections: [
          {
            id: "image",
            content: item => (<img src={item.image || '#'} alt={item.name} width='100%' />)
          },
          {
            id: "description",
            header: "Description",
            content: item => item.description
          },
          {
            id: 'state',
            header: 'Status',
            content: item => (
              <StatusIndicator type={(item.class_flag ?? 0) > 0 ? 'error' : 'success'}>
                {(item.class_flag ?? 0) > 0 ? "Unavailable" : "Available"}
              </StatusIndicator>
            ),
          },
        ]
      }}
      cardsPerRow={[
        { cards: 1 },
        { minWidth: 500, cards: 2 }
      ]}
      isItemDisabled={item => ((item.class_flag ?? 0) > 0)}
      items={getCurrentPageItems()}
      loading={loading}
      loadingText="Loading contents"
      empty={
        <Box
          padding={{ bottom: "s" }}
          fontSize="heading-s"
          textAlign="center"
          color="inherit"
        >
          <b>No Contents</b>
        </Box>
      }
      header={activeCourse && activeCourse != null ? (
        <Header>{activeCourse.name}</Header>
      ) : (
        <div />
      )}
      pagination={
        <Pagination 
          currentPageIndex={currentPage}
          pagesCount={pagesCount}
          // onNextClick={() => setCurrentPage(curr => Math.min(curr + 1, pagesCount))}
          // onPreviousClick={() => setCurrentPage(curr => Math.max(curr - 1, 1))}
          onChange={({detail}) => setCurrentPage(detail.currentPageIndex)}
        />
      }
    />
  );
}

const fetchClass = async (course: any) => {
  let courseId = null;
  if (course && course != null) {
    courseId = course.id;
  }

  try {
    const { data: CoursesList } = await client.models.Class.list({
      filter: {
        courseId: {
          eq: courseId
        }
      }
    });

    return CoursesList;
  }
  catch (e) {
    console.log(e);
    return [];
  }
}

export { ClassCatalog };