import { useEffect, useState } from "react";
import {
  Cards, Link, StatusIndicator, Box, Pagination, Header, Button, Modal
} from "@cloudscape-design/components";

// api
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../amplify/data/resource';
import { CreateClassWizard } from './CreateClassWizard';

const client = generateClient<Schema>();

const ClassCatalog = ({
  activeCourse,
  setActiveClass,
  userProfile,
}: { 
  activeCourse: any, 
  setActiveClass: any,
  userProfile: any
}) => {
  const [classes, setClasses] = useState<Array<Schema["Class"]["type"]>>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  
  // Wizard state
  const [showWizard, setShowWizard] = useState(false); 

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
    const sortedClasses = classes.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA; // 최신순 (내림차순)
    });
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedClasses.slice(startIndex, startIndex + itemsPerPage);
  };

  const pagesCount = Math.ceil(classes.length / itemsPerPage);

  const handleClassCreated = (newClass: Schema["Class"]["type"]) => {
    setClasses([...classes, newClass]);
  };

  return (
    <>
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
            <div style={{ 
              wordBreak: 'break-word',
              lineHeight: '1.4'
            }}>
              {item.name}
            </div>
          </Link>
        ),
        sections: [
          {
            id: "image",
            content: item => (<img src={item.image || '#'} alt={item.name} width='100%' style={{ borderRadius: '4px' }} />)
          },
          {
            id: "description",
            header: "Description",
            content: item => (
              <div style={{ 
                wordBreak: 'break-word',
                lineHeight: '1.5'
              }}>
                {item.description}
              </div>
            )
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
        <Header
          actions={
            <Button
              variant="primary"
              iconName="add-plus"
              onClick={() => setShowWizard(true)}
            >
              Add Class
            </Button>
          }
        >
          {activeCourse.name}
        </Header>
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

      <Modal
        visible={showWizard}
        onDismiss={() => setShowWizard(false)}
        size="max"
        header="Create New Class"
      >
        <CreateClassWizard
          visible={showWizard}
          onDismiss={() => setShowWizard(false)}
          activeCourse={activeCourse}
          onComplete={handleClassCreated}
          userProfile={userProfile}
        />
      </Modal>
    </>
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