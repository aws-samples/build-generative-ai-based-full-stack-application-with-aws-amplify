import { useState, useEffect } from 'react';
import {
  Wizard,
  Container,
  FormField,
  Input,
  Textarea,
  SpaceBetween,
  Box,
  ProgressBar,
  Alert,
  FileUpload,
  Button,
  ColumnLayout
} from '@cloudscape-design/components';
import { uploadData } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

const BUCKET_NAME = 'amplify-s3-ryz';
const REGION = 'us-east-1';
const CLOUDFRONT_URL = 'https://d28jhwy9xe688b.cloudfront.net';

const toCloudFrontUrl = (url: string) => {
  if (!url) return url;
  try {
    const urlObj = new URL(url);
    return `${CLOUDFRONT_URL}${urlObj.pathname}`;
  } catch {
    return url;
  }
};

interface CreateClassWizardProps {
  visible: boolean;
  onDismiss: () => void;
  activeCourse: any;
  onComplete: (newClass: any) => void;
  userProfile: any;
}

export function CreateClassWizard({
  visible,
  onDismiss,
  activeCourse,
  onComplete,
  userProfile
}: CreateClassWizardProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isLoadingNextStep, setIsLoadingNextStep] = useState(false);

  // Step 1: Upload state
  const [videoFile, setVideoFile] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    author: userProfile?.name || '',
    videoUrl: '',
    description: '',
    transcript: '',
    image: '',
    imageUrl: '',
    subtitleUrl: ''
  });
  const [thumbnailFile, setThumbnailFile] = useState<File[]>([]);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
  const [thumbnailUploaded, setThumbnailUploaded] = useState(false);

  // Step 2: Processing state
  const [useAIFeature, setUseAIFeature] = useState<boolean | null>(null);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [executionArn, setExecutionArn] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setActiveStepIndex(0);
      setVideoFile([]);
      setUploadProgress(0);
      setFormData({
        name: '',
        author: userProfile?.name || '',
        videoUrl: '',
        description: '',
        transcript: '',
        image: '',
        imageUrl: '',
        subtitleUrl: ''
      });
      setThumbnailFile([]);
      setThumbnailUploaded(false);
      setUseAIFeature(null);
      setProcessingStatus('idle');
      setExecutionArn('');
    }
  }, [visible, userProfile]);

  // Step 1: Upload video to S3
  const handleUploadVideo = async () => {
    if (videoFile.length === 0) return;

    setIsLoadingNextStep(true);
    try {
      const file = videoFile[0];
      const fileName = `video-origin/${file.name}`;
      
      const result = await uploadData({
        path: fileName,
        data: file,
        options: {
          bucket: {
            bucketName: BUCKET_NAME,
            region: REGION
          },
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              setUploadProgress(Math.round((transferredBytes / totalBytes) * 100));
            }
          }
        }
      }).result;

      const videoUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${fileName}`;
      setFormData({ ...formData, videoUrl });
      setUploadedFileName(file.name);
      
      // Move to next step
      setActiveStepIndex(1);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload video');
    } finally {
      setIsLoadingNextStep(false);
    }
  };

  // Step 2: Start Step Function processing (auto-start)
  const startProcessing = async () => {
    setProcessingStatus('processing');
    
    try {
      const baseFileName = uploadedFileName.replace(/\.[^/.]+$/, '');
      const languages = ['english']; // Default to English only

      const { data, errors } = await client.mutations.startVideoProcessing({
        videoKey: uploadedFileName,
        bucketName: BUCKET_NAME,
        transcriptionKey: `${baseFileName}_transcription`,
        summarizedTextFileKey: `${baseFileName}_summarize.txt`,
        languages: languages,
      });

      if (errors) {
        console.error('Step Function error:', errors);
        setProcessingStatus('error');
      } else if (data) {
        const arn = data.executionArn || '';
        setExecutionArn(arn);
        // Poll for results
        pollProcessingStatus(arn);
      }
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingStatus('error');
    }
  };

  // Poll Step Function status
  const pollProcessingStatus = (arn: string) => {
    const startTime = Date.now();
    const estimatedDuration = 120000; // 2 minutes estimated
    
    // Update progress bar based on elapsed time
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(Math.round((elapsed / estimatedDuration) * 100), 95);
      setProcessingProgress(progress);
    }, 1000);

    const pollInterval = setInterval(async () => {
      try {
        const { data, errors } = await client.queries.checkExecutionStatus({
          executionArn: arn
        });

        if (errors) {
          console.error('Status check error:', errors);
          clearInterval(pollInterval);
          setProcessingStatus('error');
          return;
        }

        if (data) {
          console.log('Execution status:', data.status);

          if (data.status === 'SUCCEEDED') {
            clearInterval(pollInterval);
            clearInterval(progressInterval);
            setProcessingProgress(100);
            
            // Parse output from Step Function
            const output = data.output ? JSON.parse(data.output) : {};
            const baseFileName = uploadedFileName.replace(/\.[^/.]+$/, '');
            
            setFormData({
              ...formData,
              name: output.title || 'AI-generated title',
              description: output.description || 'AI-generated description',
              transcript: output.transcript || 'AI-generated transcript',
              subtitleUrl: output.subtitle || ''
            });
            setProcessingStatus('completed');
          } else if (data.status === 'FAILED' || data.status === 'TIMED_OUT' || data.status === 'ABORTED') {
            clearInterval(pollInterval);
            clearInterval(progressInterval);
            setProcessingStatus('error');
          }
          // If RUNNING, continue polling
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(pollInterval);
        clearInterval(progressInterval);
        setProcessingStatus('error');
      }
    }, 5000); // Poll every 5 seconds
  };

  // Step 3: Save to DynamoDB
  const handleSaveClass = async () => {
    if (!activeCourse) return;

    // Check if thumbnail is not uploaded
    if (!thumbnailUploaded) {
      alert('Please select and upload a thumbnail image before saving.');
      return;
    }

    setIsLoadingNextStep(true);
    try {
      const { data: newClass, errors } = await client.models.Class.create({
        name: formData.name,
        description: formData.description,
        url: toCloudFrontUrl(formData.videoUrl),
        author: formData.author,
        image: toCloudFrontUrl(formData.image),
        transcript: formData.transcript,
        subtitle: formData.subtitleUrl ? toCloudFrontUrl(formData.subtitleUrl) : undefined,
        courseId: activeCourse.id,
        class_flag: 0
      });

      if (!errors && newClass) {
        onComplete(newClass);
        onDismiss();
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save class');
    } finally {
      setIsLoadingNextStep(false);
    }
  };

  // Step 1 Content
  const renderStep1 = () => (
    <Container>
      <SpaceBetween size="m">
        <FormField
          label="Video File"
          constraintText="Required. Upload MP4, MOV, or AVI file"
        >
          <FileUpload
            onChange={({ detail }) => setVideoFile(detail.value)}
            value={videoFile}
            i18nStrings={{
              uploadButtonText: e => e ? "Choose files" : "Choose file",
              dropzoneText: e => e ? "Drop files to upload" : "Drop file to upload",
              removeFileAriaLabel: e => `Remove file ${e + 1}`,
              limitShowFewer: "Show fewer files",
              limitShowMore: "Show more files",
              errorIconAriaLabel: "Error"
            }}
            showFileLastModified
            showFileSize
            showFileThumbnail
            tokenLimit={1}
            accept="video/*"
          />
        </FormField>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <ProgressBar
            value={uploadProgress}
            label="Uploading video"
            description={`${uploadProgress}% complete`}
          />
        )}
      </SpaceBetween>
    </Container>
  );

  // Step 2 Content - AI Feature Selection
  const renderStep2 = () => {
    return (
      <Container>
        <SpaceBetween size="m">
          {processingStatus === 'idle' && (
            <FormField
              label="AI Processing Options"
              description="Choose an option and click Next to proceed"
            >
              <SpaceBetween size="m">
                <Button
                  variant={useAIFeature === true ? "primary" : "normal"}
                  onClick={() => setUseAIFeature(true)}
                >
                  🤖 Use AI Features
                </Button>
                <Box variant="p">
                  Automatically generate title, description and transcript using AI
                </Box>
                
                <Button
                  variant={useAIFeature === false ? "primary" : "normal"}
                  onClick={() => setUseAIFeature(false)}
                >
                  ✏️ Manual Entry
                </Button>
                <Box variant="p">
                  Skip AI processing and manually enter title, description and transcript
                </Box>
              </SpaceBetween>
            </FormField>
          )}

          {useAIFeature === true && processingStatus === 'processing' && (
            <>
              <Alert type="info">
                AI is processing your video. This may take a few minutes...
              </Alert>
              <ProgressBar
                value={processingProgress}
                label="Processing video"
                description={`${processingProgress}% - Generating description and transcript`}
              />
            </>
          )}

          {useAIFeature === true && processingStatus === 'completed' && (
            <>
              <Alert type="success">
                Processing completed successfully!
              </Alert>
              
              <FormField label="Generated Title" description="AI-generated title from Step Function">
                <Box variant="awsui-key-label">
                  <div style={{ padding: '12px', backgroundColor: '#f2f3f3', borderRadius: '4px' }}>
                    {formData.name}
                  </div>
                </Box>
              </FormField>

              <FormField label="Generated Description" description="AI-generated description from Step Function">
                <Box variant="awsui-key-label">
                  <div style={{ padding: '12px', backgroundColor: '#f2f3f3', borderRadius: '4px' }}>
                    {formData.description}
                  </div>
                </Box>
              </FormField>

              <FormField label="Generated Transcript" description="AI-generated transcript from Step Function">
                <Box variant="code">
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', maxHeight: '300px', overflow: 'auto' }}>
                    {formData.transcript}
                  </pre>
                </Box>
              </FormField>
            </>
          )}

          {useAIFeature === true && processingStatus === 'error' && (
            <Alert type="error">
              Processing failed. Please try again or contact support.
            </Alert>
          )}
        </SpaceBetween>
      </Container>
    );
  };

  // Upload thumbnail image
  const handleUploadThumbnail = async () => {
    if (thumbnailFile.length === 0) return;

    try {
      const file = thumbnailFile[0];
      const fileName = `Image/${file.name}`;
      
      await uploadData({
        path: fileName,
        data: file,
        options: {
          bucket: {
            bucketName: BUCKET_NAME,
            region: REGION
          },
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              setThumbnailUploadProgress(Math.round((transferredBytes / totalBytes) * 100));
            }
          }
        }
      }).result;

      const imageUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${fileName}`;
      setFormData({ ...formData, imageUrl, image: imageUrl });
      setThumbnailUploadProgress(0);
      setThumbnailUploaded(true);
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      alert('Failed to upload thumbnail');
      setThumbnailUploadProgress(0);
    }
  };

  // Step 3 Content
  const renderStep3 = () => (
    <Container>
      <SpaceBetween size="m">
        <Alert type="info">
          Review and edit the information before saving.
        </Alert>

        <ColumnLayout columns={2}>
          <FormField label="Title">
            <Input
              value={formData.name}
              onChange={({ detail }) => setFormData({ ...formData, name: detail.value })}
            />
          </FormField>

          <FormField label="Author">
            <Input
              value={formData.author}
              onChange={({ detail }) => setFormData({ ...formData, author: detail.value })}
            />
          </FormField>
        </ColumnLayout>

        <FormField label="Description">
          <Textarea
            value={formData.description}
            onChange={({ detail }) => setFormData({ ...formData, description: detail.value })}
            rows={4}
          />
        </FormField>

        <FormField label="Thumbnail Image" description={`Upload thumbnail image to s3://${BUCKET_NAME}/Image`}>
          <SpaceBetween size="s">
            <FileUpload
              onChange={({ detail }) => setThumbnailFile(detail.value)}
              value={thumbnailFile}
              i18nStrings={{
                uploadButtonText: e => e ? "Choose files" : "Choose file",
                dropzoneText: e => e ? "Drop files to upload" : "Drop file to upload",
                removeFileAriaLabel: e => `Remove file ${e + 1}`,
                limitShowFewer: "Show fewer files",
                limitShowMore: "Show more files",
                errorIconAriaLabel: "Error"
              }}
              showFileLastModified
              showFileSize
              showFileThumbnail
              tokenLimit={1}
              accept="image/*"
            />
            {thumbnailFile.length > 0 && (
              <Button onClick={handleUploadThumbnail}>Upload Thumbnail</Button>
            )}
            {thumbnailUploadProgress > 0 && thumbnailUploadProgress < 100 && (
              <ProgressBar
                value={thumbnailUploadProgress}
                label="Uploading thumbnail"
                description={`${thumbnailUploadProgress}% complete`}
              />
            )}
            {thumbnailUploaded && (
              <Alert type="success">Upload completed!</Alert>
            )}
          </SpaceBetween>
        </FormField>

        <FormField label="Transcript" description="Edit if needed">
          <Textarea
            value={formData.transcript}
            onChange={({ detail }) => setFormData({ ...formData, transcript: detail.value })}
            rows={8}
          />
        </FormField>
      </SpaceBetween>
    </Container>
  );

  return (
    <Wizard
      i18nStrings={{
        stepNumberLabel: stepNumber => `Step ${stepNumber}`,
        collapsedStepsLabel: (stepNumber, stepsCount) =>
          `Step ${stepNumber} of ${stepsCount}`,
        skipToButtonLabel: (step, stepNumber) => `Skip to ${step.title}`,
        navigationAriaLabel: "Steps",
        cancelButton: "Cancel",
        previousButton: "Previous",
        nextButton: "Next",
        submitButton: "Save Class",
        optional: "optional"
      }}
      onNavigate={({ detail }) => {
        const { requestedStepIndex } = detail;
        
        // Going forward
        if (requestedStepIndex > activeStepIndex) {
          if (requestedStepIndex === 1 && activeStepIndex === 0) {
            handleUploadVideo();
          } else if (requestedStepIndex === 2 && activeStepIndex === 1) {
            if (useAIFeature === true && processingStatus === 'idle') {
              // Start processing when Next is clicked
              startProcessing();
            } else if (useAIFeature === false || processingStatus === 'completed') {
              setActiveStepIndex(2);
            }
          } else {
            setActiveStepIndex(requestedStepIndex);
          }
        }
        // Going backward - always allow
        else if (requestedStepIndex < activeStepIndex) {
          // Reset states when going back to step 1
          if (requestedStepIndex === 1) {
            setUseAIFeature(null);
            setProcessingStatus('idle');
            setExecutionArn('');
            setProcessingProgress(0);
          }
          setActiveStepIndex(requestedStepIndex);
        }
      }}
      onCancel={onDismiss}
      onSubmit={handleSaveClass}
      activeStepIndex={activeStepIndex}
      isLoadingNextStep={isLoadingNextStep}
      allowSkipTo={false}
      steps={[
        {
          title: "Upload Video",
          description: "Upload your video file and provide basic information",
          content: renderStep1(),
          isOptional: false
        },
        {
          title: "AI Processing",
          description: "AI generates description and transcript",
          content: renderStep2(),
          isOptional: false
        },
        {
          title: "Review & Save",
          description: "Review and edit the generated content",
          content: renderStep3(),
          isOptional: false
        }
      ]}
    />
  );
}
