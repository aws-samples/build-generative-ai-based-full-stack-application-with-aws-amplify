import json
import boto3
from boto3.dynamodb.conditions import Attr, Contains
from decimal import Decimal

def lambda_handler(event, context):
    """
    Bedrock Agent Action Group을 위한 Lambda 함수
    사용자 질문에 기반하여 관련 영상을 검색합니다.
    """
    
    print(f"📥 받은 이벤트: {json.dumps(event, default=str)}")
    
    try:
        function_name = event.get('function', '')
        parameters = event.get('parameters', [])
        
        # DynamoDB 클라이언트 초기화
        dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-2')
        
        if function_name == 'search_classes':
            result = search_classes(dynamodb, parameters)
        else:
            result = {
                'statusCode': 400,
                'body': json.dumps({'error': 'Unknown function'})
            }
        
        # Bedrock Agent 응답 형식
        return {
            'messageVersion': '1.0',
            'response': {
                'actionGroup': event.get('actionGroup', 'ClassSearchActions'),
                'function': function_name,
                'functionResponse': {
                    'responseBody': {
                        'TEXT': {
                            'body': result.get('body', '{}')
                        }
                    }
                }
            }
        }
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        return {
            'messageVersion': '1.0',
            'response': {
                'actionGroup': event.get('actionGroup', 'ClassSearchActions'),
                'function': event.get('function', 'search_classes'),
                'functionResponse': {
                    'responseBody': {
                        'TEXT': {
                            'body': json.dumps({'error': str(e)})
                        }
                    }
                }
            }
        }

def search_classes(dynamodb, parameters):
    """DynamoDB에서 영상 검색 - 향상된 검색 로직"""
    
    print(f"🔍 검색 파라미터: {parameters}")
    
    # 파라미터 추출
    search_terms = []
    difficulty_level = None
    
    for param in parameters:
        if param['name'] == 'search_terms':
            # 쉼표로 구분된 검색어를 개별 키워드로 분리
            raw_terms = param['value'].replace(',', ' ').split()
            search_terms = [term.strip() for term in raw_terms if term.strip()]
        elif param['name'] == 'difficulty_level':
            difficulty_level = param['value']
    
    print(f"🔎 검색어: {search_terms}, 난이도: {difficulty_level}")
    
    table_name = 'Class-7445a6ztsfdylpiczrn5hdh3ry-NONE'
    
    try:
        table = dynamodb.Table(table_name)
        
        # 활성 영상만 조회 (class_flag != 10)
        base_filter = Attr('class_flag').ne(10) & (Attr('class_flag').eq(0) | Attr('class_flag').not_exists())
        
        if search_terms:
            # 각 검색어에 대해 name과 description에서 검색
            search_conditions = []
            for term in search_terms:
                # 대소문자 구분 없이 검색
                term_lower = term.lower()
                term_upper = term.upper()
                term_title = term.title()
                
                # name 필드에서 검색
                search_conditions.extend([
                    Contains(Attr('name'), term),
                    Contains(Attr('name'), term_lower),
                    Contains(Attr('name'), term_upper),
                    Contains(Attr('name'), term_title)
                ])
                
                # description 필드에서 검색
                search_conditions.extend([
                    Contains(Attr('description'), term),
                    Contains(Attr('description'), term_lower),
                    Contains(Attr('description'), term_upper),
                    Contains(Attr('description'), term_title)
                ])
            
            # OR 조건으로 결합
            if search_conditions:
                search_filter = search_conditions[0]
                for condition in search_conditions[1:]:
                    search_filter = search_filter | condition
                
                final_filter = base_filter & search_filter
            else:
                final_filter = base_filter
        else:
            final_filter = base_filter
        
        # 난이도 필터 추가
        if difficulty_level:
            difficulty_filter = Attr('difficulty').eq(difficulty_level)
            final_filter = final_filter & difficulty_filter
        
        # 스캔 실행
        response = table.scan(
            FilterExpression=final_filter,
            Limit=50
        )
        
        print(f"📊 스캔 결과: {len(response.get('Items', []))}개 항목")
        
        # 결과 포맷팅 - 더 자세한 정보 포함
        classes = []
        for item in response.get('Items', []):
            class_flag = item.get('class_flag', 0)
            if isinstance(class_flag, Decimal):
                class_flag = int(class_flag)
            
            if class_flag != 10:  # 비활성이 아닌 것만
                class_info = {
                    'id': str(item.get('id', '')),
                    'name': str(item.get('name', '')),
                    'description': str(item.get('description', '')),
                    'author': str(item.get('author', '')),
                    'difficulty': str(item.get('difficulty', 'intermediate')),
                    'url': str(item.get('url', '')),
                    'image': str(item.get('image', '')),
                    'courseId': str(item.get('courseId', ''))
                }
                
                # 검색어와의 관련성 점수 계산 (간단한 매칭)
                relevance_score = 0
                name_lower = class_info['name'].lower()
                desc_lower = class_info['description'].lower()
                
                for term in search_terms:
                    term_lower = term.lower()
                    if term_lower in name_lower:
                        relevance_score += 10  # 제목 매칭은 높은 점수
                    if term_lower in desc_lower:
                        relevance_score += 5   # 설명 매칭은 중간 점수
                
                class_info['relevance_score'] = relevance_score
                classes.append(class_info)
        
        # 관련성 점수로 정렬 (높은 점수 우선)
        classes.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        # 상위 10개만 반환
        top_classes = classes[:10]
        
        result_body = json.dumps({
            'classes': top_classes,
            'total_found': len(top_classes),
            'search_terms': search_terms,
            'message': f"'{' '.join(search_terms)}' 키워드로 {len(top_classes)}개의 관련 영상을 찾았습니다."
        }, ensure_ascii=False)
        
        print(f"✅ 검색 완료: {len(top_classes)}개 영상 발견")
        
        return {
            'statusCode': 200,
            'body': result_body
        }
        
    except Exception as e:
        print(f"❌ 테이블 접근 오류: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Database error: {str(e)}'})
        }
