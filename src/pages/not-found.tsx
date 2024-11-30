import {
  Alert,
  BreadcrumbGroup,
  Container,
  ContentLayout,
  Header,
  SpaceBetween,
  Box,
  Button
} from "@cloudscape-design/components";
import { useOnFollow } from "../common/hooks/use-on-follow";
import { APP_NAME } from "../common/constants";
import BaseAppLayout from "../components/base-app-layout";
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  text: string;
  href: string;
}

const NOT_FOUND_BREADCRUMBS: BreadcrumbItem[] = [
  {
    text: APP_NAME,
    href: "/",
  },
  {
    text: "Not Found",
    href: "/not-found",
  },
];

export default function NotFound() {
  const onFollow = useOnFollow();
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <BaseAppLayout
      breadcrumbs={
        <BreadcrumbGroup
          onFollow={onFollow}
          items={NOT_FOUND_BREADCRUMBS}
          expandAriaLabel="Show path"
          ariaLabel="Breadcrumbs"
        />
      }
      content={
        <ContentLayout
          header={
            <Header 
              variant="h1"
              description="The page you are looking for could not be found."
            >
              404 - Page Not Found
            </Header>
          }
        >
          <SpaceBetween size="l">
            <Container>
              <Box margin={{ bottom: 'l' }}>
                <Alert
                  type="error"
                  header="Page Not Found"
                  action={
                    <Button 
                      onClick={handleGoHome}
                      variant="primary"
                    >
                      Go to Home
                    </Button>
                  }
                >
                  We're sorry, but you need to be signed in to access this page.
                  Please sign in to continue.
                </Alert>
              </Box>
            </Container>
          </SpaceBetween>
        </ContentLayout>
      }
    />
  );
}