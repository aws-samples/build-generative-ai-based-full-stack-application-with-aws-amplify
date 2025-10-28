import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import { readFileSync } from 'fs';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

// JSON 파일 읽기
const outputs = JSON.parse(readFileSync('./amplify_outputs.json', 'utf8'));

Amplify.configure(outputs, {
  Auth: {
    credentialsProvider: {
      getCredentialsAndIdentityId: async () => {
        const credentials = await fromNodeProviderChain()();
        return { credentials };
      },
      clearCredentialsAndIdentityId: () => {}
    }
  }
});

const client = generateClient({
  authMode: 'iam'
});

// AWS 서비스 태그 매핑
const serviceTagMapping = {
  'eks': ['kubernetes', 'container', 'orchestration'],
  'lambda': ['serverless', 'function', 'compute'],
  'dynamodb': ['database', 'nosql', 'storage'],
  's3': ['storage', 'object', 'bucket'],
  'apigateway': ['api', 'rest', 'http'],
  'cloudformation': ['iac', 'infrastructure', 'template']
};

// 난이도 추론 함수
function inferDifficulty(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  
  if (text.includes('기초') || text.includes('초급') || text.includes('입문') || 
      text.includes('basic') || text.includes('beginner') || text.includes('intro')) {
    return 'beginner';
  }
  
  if (text.includes('고급') || text.includes('심화') || text.includes('advanced') || 
      text.includes('expert') || text.includes('deep')) {
    return 'advanced';
  }
  
  return 'intermediate';
}

// 태그 추출 함수
function extractTags(name, description, transcript) {
  const text = `${name} ${description} ${transcript || ''}`.toLowerCase();
  const tags = [];
  
  // AWS 서비스 태그 추출
  Object.keys(serviceTagMapping).forEach(service => {
    if (text.includes(service)) {
      tags.push(service);
      // 관련 태그도 추가
      tags.push(...serviceTagMapping[service]);
    }
  });
  
  // 중복 제거
  return [...new Set(tags)];
}

// 검색 가능한 텍스트 생성
function createSearchableText(classData) {
  return [
    classData.name || '',
    classData.description || '',
    classData.transcript || '',
    classData.comments || '',
    classData.author || ''
  ].join(' ').toLowerCase();
}

async function migrateSearchFields() {
  try {
    console.log('🔄 기존 클래스 데이터 조회 중...');
    
    // 모든 클래스 조회
    const result = await client.models.Class.list();
    console.log('📊 조회 결과:', JSON.stringify(result, null, 2));
    
    const classes = result.data || [];
    console.log(`📊 총 ${classes.length}개 클래스 발견`);
    
    if (result.errors) {
      console.error('⚠️ 조회 에러:', result.errors);
    }
    
    for (const cls of classes) {
      console.log(`🔧 클래스 업데이트 중: ${cls.name}`);
      
      // 검색 최적화 필드 생성
      const searchableText = createSearchableText(cls);
      const difficulty = inferDifficulty(cls.name || '', cls.description || '');
      const tags = extractTags(cls.name || '', cls.description || '', cls.transcript);
      
      // 클래스 업데이트
      await client.models.Class.update({
        id: cls.id,
        searchableText,
        difficulty,
        tags
      });
      
      console.log(`✅ 업데이트 완료: ${cls.name} (난이도: ${difficulty}, 태그: ${tags.join(', ')})`);
    }
    
    console.log('🎉 모든 클래스 마이그레이션 완료!');
    
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  }
}

// 스크립트 실행
migrateSearchFields();