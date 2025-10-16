import { useState, useRef, useEffect } from "react";
import {
  Container, SpaceBetween, Button, Box, Header,
  Textarea, ExpandableSection, Link, Badge, Spinner
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
  const sessionId = useRef(`session-${Date.now()}`);

  const processingMessages = [
    "🔍 질문을 분석하고 있습니다...",
    "📚 관련 강의를 검색하고 있습니다...",
    "🤖 AI가 최적의 답변을 생성하고 있습니다...",
    "✨ 결과를 정리하고 있습니다..."
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

  const simulateStreaming = (text: string, messageId: string, traces: string[] = []) => {
    const words = text.split(' ');
    let currentText = '';
    
    // First show traces if available
    if (traces.length > 0) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, traces }
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
              ? { ...msg, content: currentText }
              : msg
          )
        );
        
        if (index === words.length - 1) {
          setStreamingMessageId(null);
          // Parse markdown and extract links
          const { elements, links } = parseMarkdownResponse(currentText);
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, links, content: currentText }
                : msg
            )
          );
        }
      }, index * 50); // 50ms delay between words
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
      const result = await client.queries.searchWithAgent({
        query: query,
        sessionId: sessionId.current
      });
      
      const responseText = result.data?.response || 'No response received';
      const traces = result.data?.traces || [];
      
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

  const renderSection = (section: Section, index: number) => {
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
        return (
          <Box key={index} padding="s" variant="div" style={{ border: '1px solid #e9ebed', borderRadius: '8px' }}>
            <SpaceBetween size="s">
              <Header variant="h4">{section.title}</Header>
              <SpaceBetween size="xs" direction="horizontal">
                <Badge color={
                  section.difficulty === '초급' ? 'green' : 
                  section.difficulty === '중급' ? 'blue' : 'red'
                }>
                  {section.difficulty}
                </Badge>
                <Box fontSize="body-s">강사: {section.instructor}</Box>
              </SpaceBetween>
              <Box fontSize="body-s">{section.description}</Box>
              <Box fontSize="body-s" color="text-status-info">
                💡 {section.reason}
              </Box>
              <Link external href={section.link}>
                강의 보기 →
              </Link>
            </SpaceBetween>
          </Box>
        );
      
      case 'roadmap':
        return (
          <Box key={index}>
            <Header variant="h4">{section.title}</Header>
            <SpaceBetween size="s">
              {section.steps.map((step, stepIndex) => (
                <Box key={stepIndex} padding="s" style={{ backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                  <SpaceBetween size="xs">
                    <Header variant="h5">{step.step}: {step.title}</Header>
                    <Box fontSize="body-s">{step.description}</Box>
                    {step.courses.length > 0 && (
                      <Box fontSize="body-s">
                        <strong>관련 강의:</strong> {step.courses.join(', ')}
                      </Box>
                    )}
                  </SpaceBetween>
                </Box>
              ))}
            </SpaceBetween>
          </Box>
        );
      
      case 'list':
        return (
          <Box key={index}>
            <Header variant="h4">{section.title}</Header>
            <SpaceBetween size="xs">
              {section.items.map((item, itemIndex) => (
                <Box key={itemIndex} margin={{ left: "s" }}>
                  • {item.link ? (
                    <Link external href={item.link}>{item.text}</Link>
                  ) : (
                    item.text
                  )}
                </Box>
              ))}
            </SpaceBetween>
          </Box>
        );
      
      default:
        return null;
    }
  };

  const renderMessage = (message: ChatMessage) => {
    if (message.type === 'user') {
      return (
        <Box 
          key={message.id}
          padding="m"
          style={{ 
            backgroundColor: '#e3f2fd', 
            borderRadius: '8px',
            marginLeft: '20%'
          }}
        >
          <SpaceBetween size="xs">
            <Box fontSize="body-s" color="text-status-info">You</Box>
            <Box>{message.content}</Box>
          </SpaceBetween>
        </Box>
      );
    }

    return (
      <Box 
        key={message.id}
        padding="m"
        style={{ 
          backgroundColor: '#f5f5f5', 
          borderRadius: '8px',
          marginRight: '10%'
        }}
      >
        <SpaceBetween size="s">
          <Box fontSize="body-s" color="text-status-info">
            🤖 Agent {streamingMessageId === message.id && (
              <SpaceBetween size="xs" direction="horizontal">
                <Spinner size="small" />
                <span>응답 생성 중...</span>
              </SpaceBetween>
            )}
          </Box>
          
          {/* Show traces if available */}
          {message.traces && message.traces.length > 0 && (
            <ExpandableSection headerText={`🔍 처리 단계 (${message.traces.length}개)`} variant="container">
              <SpaceBetween size="xs">
                {message.traces.map((trace, index) => (
                  <Box key={index} padding="xs" style={{ backgroundColor: '#f0f8ff', borderRadius: '4px', fontSize: '12px' }}>
                    {trace}
                  </Box>
                ))}
              </SpaceBetween>
            </ExpandableSection>
          )}
          
          {/* Render markdown content */}
          <SpaceBetween size="m">
            {parseMarkdownResponse(message.content).elements}
          </SpaceBetween>
          
          {/* Show links at the bottom */}
          {message.links && message.links.length > 0 && (
            <Container>
              <Header variant="h4">🔗 관련 링크 ({message.links.length}개)</Header>
              <SpaceBetween size="xs">
                {message.links.map((link, index) => (
                  <Box 
                    key={index}
                    padding="s"
                    style={{ 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}
                  >
                    <SpaceBetween size="xs" direction="horizontal" alignItems="center">
                      <Badge color="blue">{index + 1}</Badge>
                      <Link external href={link.url} fontSize="body-s">
                        {link.title}
                      </Link>
                    </SpaceBetween>
                  </Box>
                ))}
              </SpaceBetween>
            </Container>
          )}
          
          <ExpandableSection headerText="원본 응답 보기" variant="footer">
            <Box padding="s" style={{ backgroundColor: '#fff', borderRadius: '4px' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{message.content}</pre>
            </Box>
          </ExpandableSection>
        </SpaceBetween>
      </Box>
    );
  };

  return (
    <BaseAppLayout
      content={
        <div>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          `}</style>
          
          <SpaceBetween size="l">
          <Container>
            <Header variant="h1">🤖 Bedrock Agent Chat</Header>
            <Box fontSize="body-s" color="text-status-info">
              Session ID: {sessionId.current}
            </Box>
          </Container>
          
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
                      <span>🤖 Agent가 작업 중입니다</span>
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
                >
                  Send
                </Button>
                <Button 
                  onClick={() => {
                    setMessages([]);
                    sessionId.current = `session-${Date.now()}`;
                  }}
                >
                  New Session
                </Button>
              </SpaceBetween>
              
              <Box fontSize="body-s" color="text-status-info">
                Tip: Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to send
              </Box>
            </SpaceBetween>
          </Container>
        </SpaceBetween>
      </div>
      }
    />
  );
}
