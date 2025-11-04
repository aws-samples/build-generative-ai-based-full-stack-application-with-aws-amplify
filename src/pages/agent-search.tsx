import { useState, useRef, useEffect } from "react";
import {
  Container, SpaceBetween, Button, Box, Header,
  Textarea, ExpandableSection, Link, Badge, Spinner, ColumnLayout
} from "@cloudscape-design/components";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../amplify/data/resource';
import BaseAppLayout from "../components/base-app-layout";

const client = generateClient<Schema>({
  authMode: 'userPool'
});

interface Course {
  type: 'course';
  title: string;
  difficulty: string;
  instructor: string;
  description: string;
  link: string;
  reason: string;
  thumbnail: string;
}

interface RoadmapStep {
  step: string;
  title: string;
  description: string;
  courses: string[];
}

interface Roadmap {
  type: 'roadmap';
  title: string;
  steps: RoadmapStep[];
}

interface ListItem {
  text: string;
  link?: string;
}

interface List {
  type: 'list';
  title: string;
  items: ListItem[];
}

interface TextSection {
  type: 'text';
  content: string;
}

interface HeaderSection {
  type: 'header';
  level: number;
  content: string;
}

type Section = Course | Roadmap | List | TextSection | HeaderSection;

interface AgentResponse {
  title: string;
  sections: Section[];
}

interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  parsedResponse?: AgentResponse;
  traces?: string[];
  links?: { title: string; url: string }[];
  timestamp: Date;
}

export default function AgentSearch() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [processingSteps, setProcessingSteps] = useState<string[]>([]);
  const [courseThumbnails, setCourseThumbnails] = useState<Record<string, string>>({});
  const sessionId = useRef(`session-${Date.now()}`);

  const processingMessages = [
    "🔍 Analyzing your question...",
    "📚 Searching for relevant courses...",
    "🤖 AI is generating the best answer...",
    "✨ Organizing results..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      let stepIndex = 0;
      setProcessingSteps([processingMessages[0]]);
      
      interval = setInterval(() => {
        stepIndex++;
        if (stepIndex < processingMessages.length) {
          setProcessingSteps(prev => [...prev, processingMessages[stepIndex]]);
        }
      }, 1500);
    } else {
      setProcessingSteps([]);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  const parseMarkdownResponse = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    const links: { title: string; url: string }[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Main title (# )
      if (line.startsWith('# ')) {
        elements.push(
          <Header key={key++} variant="h2">
            {line.substring(2)}
          </Header>
        );
      }
      // Section headers (## )
      else if (line.startsWith('## ')) {
        elements.push(
          <Header key={key++} variant="h3">
            {line.substring(3)}
          </Header>
        );
      }
      // Subsection headers (### )
      else if (line.startsWith('### ')) {
        elements.push(
          <Header key={key++} variant="h4">
            {line.substring(4)}
          </Header>
        );
      }
      // Bullet points (* or -)
      else if (line.match(/^\s*[\*\-]\s+\*\*(.+?)\*\*/)) {
        const match = line.match(/^\s*[\*\-]\s+\*\*(.+?)\*\*(.*)/);
        if (match) {
          elements.push(
            <Box key={key++} margin={{ left: "m", bottom: "xs" }}>
              <strong>{match[1]}</strong>{match[2]}
            </Box>
          );
        }
      }
      else if (line.match(/^\s*[\*\-]\s+/)) {
        const content = line.replace(/^\s*[\*\-]\s+/, '');
        // Extract links from bullet points
        const linkMatch = content.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          links.push({ title: linkMatch[1], url: linkMatch[2] });
          const textWithoutLink = content.replace(/\[([^\]]+)\]\(([^)]+)\)/, linkMatch[1]);
          elements.push(
            <Box key={key++} margin={{ left: "m", bottom: "xs" }}>
              • {textWithoutLink}
            </Box>
          );
        } else {
          elements.push(
            <Box key={key++} margin={{ left: "m", bottom: "xs" }}>
              • {content}
            </Box>
          );
        }
      }
      // Regular text with links
      else if (line.includes('[') && line.includes('](')) {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let processedLine = line;
        let match;
        
        while ((match = linkRegex.exec(line)) !== null) {
          links.push({ title: match[1], url: match[2] });
          processedLine = processedLine.replace(match[0], match[1]);
        }
        
        if (processedLine.trim()) {
          elements.push(
            <Box key={key++} margin={{ bottom: "xs" }}>
              {processedLine}
            </Box>
          );
        }
      }
      // Emoji headers (1️⃣, 2️⃣, etc.)
      else if (line.match(/^\s*[0-9]️⃣/)) {
        elements.push(
          <Header key={key++} variant="h4">
            {line.trim()}
          </Header>
        );
      }
      // Regular text (non-empty)
      else if (line.trim()) {
        elements.push(
          <Box key={key++} margin={{ bottom: "xs" }}>
            {line}
          </Box>
        );
      }
      // Empty line - add spacing
      else {
        elements.push(<Box key={key++} margin={{ bottom: "xs" }} />);
      }
    }

    return { elements, links };
  };

  const loadCourseThumbnails = async (jsonText: string) => {
    // Lambda already returns image URLs in the response, no need to query DynamoDB
    console.log('ℹ️ Thumbnails are included in Agent response');
    return;
  };

  const convertJsonToMarkdown = (jsonText: string): string => {
    try {
      const parsed: AgentResponse = JSON.parse(jsonText);
      let markdown = `# ${parsed.title}\n\n`;
      
      parsed.sections.forEach(section => {
        if (section.type === 'header') {
          markdown += `${'#'.repeat(section.level + 1)} ${section.content}\n\n`;
        } else if (section.type === 'text') {
          markdown += `${section.content}\n\n`;
        } else if (section.type === 'course') {
          markdown += `### ${section.title}\n`;
          markdown += `**Difficulty:** ${section.difficulty} | **Instructor:** ${section.instructor}\n\n`;
          markdown += `${section.description}\n\n`;
          markdown += `💡 **Reason:** ${section.reason}\n\n`;
          markdown += `[View Course](${section.link})\n\n`;
        }
      });
      
      return markdown;
    } catch {
      return jsonText;
    }
  };

  const simulateStreaming = (text: string, messageId: string, traces: string[] = []) => {
    const markdownText = convertJsonToMarkdown(text);
    const words = markdownText.split(' ');
    let currentText = '';
    
    // Parse JSON response
    let parsedData: AgentResponse | undefined;
    try {
      parsedData = JSON.parse(text);
    } catch (e) {
      // Not JSON, use markdown
    }
    
    if (traces.length > 0) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, traces, parsedResponse: parsedData }
            : msg
        )
      );
    }
    
    words.forEach((word, index) => {
      setTimeout(() => {
        currentText += (index === 0 ? '' : ' ') + word;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, content: currentText, parsedResponse: parsedData }
              : msg
          )
        );
        
        if (index === words.length - 1) {
          setStreamingMessageId(null);
          const { elements, links } = parseMarkdownResponse(currentText);
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, links, content: currentText, parsedResponse: parsedData }
                : msg
            )
          );
        }
      }, index * 50);
    });
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    // Add placeholder agent message
    const agentMessageId = `agent-${Date.now()}`;
    const agentMessage: ChatMessage = {
      id: agentMessageId,
      type: 'agent',
      content: '',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, agentMessage]);
    setStreamingMessageId(agentMessageId);
    
    try {
      // Use new session for each query to prevent token accumulation
      const newSessionId = `session-${Date.now()}`;
      console.log('🔍 Calling searchWithAgent:', { query, sessionId: newSessionId });

      const result = await client.queries.searchWithAgent({
        query: query,
        sessionId: newSessionId
      });
      
      console.log('✅ searchWithAgent result:', result);
      console.log('📦 result.data:', result.data);
      console.log('⚠️ result.errors:', result.errors);

      if (result.errors && result.errors.length > 0) {
        console.error('❌ GraphQL Errors:', result.errors);
        console.error('❌ Full Error Details:', JSON.stringify(result.errors, null, 2));
        const errorMessages = result.errors.map(e => e.message).join('\n');
        const errorType = result.errors[0]?.errorType || 'Unknown';
        setMessages(prev => 
          prev.map(msg => 
            msg.id === agentMessageId 
              ? { ...msg, content: `⚠️ Error occurred (${errorType}):\n${errorMessages}\n\nPlease try again.` }
              : msg
          )
        );
        setStreamingMessageId(null);
        return;
      }

      const responseText = result.data?.response || 'No response received';
      const traces = result.data?.traces || [];
      
      console.log('📝 Response text:', responseText);
      console.log('🔎 Traces:', traces);
      
      // Load thumbnails
      await loadCourseThumbnails(responseText);
      
      // Start streaming simulation
      simulateStreaming(responseText, agentMessageId, traces);
      setQuery(""); // Clear input
      
    } catch (error) {
      console.error('Search error:', error);
      const errorText = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === agentMessageId 
            ? { ...msg, content: errorText }
            : msg
        )
      );
      setStreamingMessageId(null);
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (section: Section, index: number, courseNumber?: number) => {
    // Count course sections for numbering
    const courseIndex = index;
    
    switch (section.type) {
      case 'header':
        const variant = section.level === 1 ? 'h2' : section.level === 2 ? 'h3' : 'h4';
        return (
          <Header key={index} variant={variant}>
            {section.content}
          </Header>
        );
      
      case 'text':
        return (
          <Box key={index} margin={{ bottom: "s" }}>
            {section.content}
          </Box>
        );
      
      case 'course':
        const thumbnail = courseThumbnails[section.link] || section.thumbnail;
        return (
          <Container
            key={index}
            header={
              <Header
                variant="h2"
                description={`Instructor: ${section.instructor}`}
              >
                🎬 Course {courseNumber}: {section.title}
              </Header>
            }
          >
            <SpaceBetween size="l">
              {thumbnail && (
                <Link href={section.link} external>
                  <img 
                    src={thumbnail} 
                    alt={section.title}
                    style={{ 
                      width: '100%',
                      maxWidth: '600px',
                      borderRadius: '8px'
                    }}
                  />
                </Link>
              )}
              
              <ColumnLayout columns={2} variant="text-grid">
                <div>
                  <Box variant="awsui-key-label">Difficulty</Box>
                  <Badge color={
                    section.difficulty === 'beginner' ? 'green' : 
                    section.difficulty === 'intermediate' ? 'blue' : 'red'
                  }>
                    {section.difficulty.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Box variant="awsui-key-label">Instructor</Box>
                  <Box>{section.instructor}</Box>
                </div>
              </ColumnLayout>

              <div>
                <Box variant="awsui-key-label">Description</Box>
                <Box>{section.description}</Box>
              </div>

              <Container>
                <Box variant="awsui-key-label">💡 Why this course?</Box>
                <Box>{section.reason}</Box>
              </Container>

              <Button href={section.link} iconName="external" target="_blank">
                View Course
              </Button>
            </SpaceBetween>
          </Container>
        );
      
      case 'roadmap':
        return (
          <Container key={index} header={<Header variant="h3">{section.title}</Header>}>
            <SpaceBetween size="m">
              {section.steps.map((step, stepIndex) => (
                <Container key={stepIndex}>
                  <SpaceBetween size="s">
                    <Header variant="h4">{step.step}: {step.title}</Header>
                    <Box>{step.description}</Box>
                    {step.courses.length > 0 && (
                      <div>
                        <Box variant="awsui-key-label">Related Courses</Box>
                        <Box>{step.courses.join(', ')}</Box>
                      </div>
                    )}
                  </SpaceBetween>
                </Container>
              ))}
            </SpaceBetween>
          </Container>
        );
      
      case 'list':
        return (
          <Container key={index} header={<Header variant="h3">{section.title}</Header>}>
            <SpaceBetween size="xs">
              {section.items.map((item, itemIndex) => (
                <Box key={itemIndex}>
                  • {item.link ? (
                    <Link external href={item.link}>{item.text}</Link>
                  ) : (
                    item.text
                  )}
                </Box>
              ))}
            </SpaceBetween>
          </Container>
        );
      
      default:
        return null;
    }
  };

  const renderMessage = (message: ChatMessage) => {
    if (message.type === 'user') {
      return (
        <Container key={message.id}>
          <SpaceBetween size="xs">
            <Box variant="awsui-key-label">👤 You</Box>
            <Box>{message.content}</Box>
          </SpaceBetween>
        </Container>
      );
    }

    return (
      <Container key={message.id}>
        <SpaceBetween size="m">
          <SpaceBetween size="xs" direction="horizontal" alignItems="center">
            <Box variant="awsui-key-label">🤖 AI Agent</Box>
            {streamingMessageId === message.id && (
              <SpaceBetween size="xs" direction="horizontal" alignItems="center">
                <Spinner size="small" />
                <Box fontSize="body-s" color="text-status-info">typing...</Box>
              </SpaceBetween>
            )}
          </SpaceBetween>
          
          {message.traces && message.traces.length > 0 && (
            <ExpandableSection headerText={`🔍 Processing Steps (${message.traces.length})`} variant="container">
              <SpaceBetween size="xs">
                {message.traces.map((trace, index) => (
                  <Box key={index} padding="xs" style={{ backgroundColor: '#f0f8ff', borderRadius: '4px', fontSize: '12px' }}>
                    {trace}
                  </Box>
                ))}
              </SpaceBetween>
            </ExpandableSection>
          )}
          
          {message.parsedResponse ? (
            <SpaceBetween size="l">
              {message.parsedResponse.sections.map((section, index) => {
                // Calculate course number
                const courseNumber = message.parsedResponse!.sections
                  .slice(0, index)
                  .filter(s => s.type === 'course').length + 1;
                return renderSection(section, index, section.type === 'course' ? courseNumber : undefined);
              })}
            </SpaceBetween>
          ) : (
            <SpaceBetween size="m">
              {parseMarkdownResponse(message.content).elements}
            </SpaceBetween>
          )}
          
          <ExpandableSection headerText="View Original Response" variant="footer">
            <Box padding="s" style={{ backgroundColor: '#fff', borderRadius: '4px' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{message.content}</pre>
            </Box>
          </ExpandableSection>
        </SpaceBetween>
      </Container>
    );
  };

  return (
    <BaseAppLayout
      content={
        <Container>
          <SpaceBetween size="l">
            <Header 
              variant="h1" 
              description="Ask questions and get AI-powered course recommendations"
            >
              🤖 Bedrock Agent Chat
            </Header>
          
          {/* Chat History */}
          {messages.length > 0 && (
            <Container>
              <SpaceBetween size="m">
                {messages.map(renderMessage)}
              </SpaceBetween>
            </Container>
          )}
          
          {/* Processing Status */}
          {loading && (
            <Container>
              <Box 
                padding="l"
                style={{ 
                  backgroundColor: '#f0f8ff', 
                  borderRadius: '12px',
                  border: '2px dashed #2196f3'
                }}
              >
                <SpaceBetween size="m" alignItems="center">
                  <Header variant="h3">
                    <SpaceBetween size="s" direction="horizontal" alignItems="center">
                      <Spinner size="large" />
                      <span>🤖 Agent is working</span>
                    </SpaceBetween>
                  </Header>
                  
                  <SpaceBetween size="s">
                    {processingSteps.map((step, index) => (
                      <Box 
                        key={index}
                        padding="s"
                        style={{ 
                          backgroundColor: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e3f2fd',
                          animation: 'fadeIn 0.5s ease-in'
                        }}
                      >
                        <SpaceBetween size="xs" direction="horizontal" alignItems="center">
                          <Badge color="blue">{index + 1}</Badge>
                          <span>{step}</span>
                          {index === processingSteps.length - 1 && <Spinner size="small" />}
                        </SpaceBetween>
                      </Box>
                    ))}
                  </SpaceBetween>
                </SpaceBetween>
              </Box>
            </Container>
          )}
          
          {/* Input Area */}
          <Container>
            <SpaceBetween size="m">
              <Textarea
                value={query}
                onChange={({ detail }) => setQuery(detail.value)}
                placeholder="Ask the agent a question..."
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSearch();
                  }
                }}
              />
              
              <SpaceBetween size="s" direction="horizontal">
                <Button 
                  variant="primary" 
                  onClick={handleSearch}
                  loading={loading}
                  disabled={!query.trim()}
                  iconName="send"
                >
                  Send
                </Button>
                <Button 
                  onClick={() => {
                    setMessages([]);
                    sessionId.current = `session-${Date.now()}`;
                  }}
                  iconName="refresh"
                >
                  New Chat
                </Button>
              </SpaceBetween>
            </SpaceBetween>
          </Container>
          </SpaceBetween>
        </Container>
      }
    />
  );
}
