import json
import os
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
        # Bedrock Agent 이벤트 구조 파싱
        api_path = event.get('apiPath', '')
        http_method = event.get('httpMethod', '')
        request_body = event.get('requestBody', {})
        
        print(f"🔍 API Path: {api_path}, Method: {http_method}")
        print(f"📦 Request Body: {request_body}")
        
        # DynamoDB 클라이언트 초기화
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        
        if api_path == '/search_classes' and http_method == 'POST':
            # requestBody에서 content 추출
            content = request_body.get('content', {})
            app_json = content.get('application/json', {})
            properties = app_json.get('properties', [])
            
            # properties에서 query 파라미터 추출
            query = ''
            for prop in properties:
                if prop.get('name') == 'query':
                    query = prop.get('value', '')
                    break
            
            print(f"🔎 추출된 query: {query}")
            result = search_classes(dynamodb, query)
            function_name = 'search_classes'
        else:
            result = {
                'statusCode': 400,
                'body': json.dumps({'error': 'Unknown endpoint'})
            }
            function_name = 'unknown'
        
        # Bedrock Agent 응답 형식 (AWS 공식 스펙)
        response = {
            'messageVersion': '1.0',
            'response': {
                'actionGroup': event.get('actionGroup', 'ClassSearchActions'),
                'apiPath': api_path,
                'httpMethod': http_method,
                'httpStatusCode': result.get('statusCode', 200),
                'responseBody': {
                    'application/json': {
                        'body': result.get('body', '{}')
                    }
                }
            }
        }
        
        print(f"📤 반환 응답: {json.dumps(response, ensure_ascii=False, default=str)}")
        return response
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        print(f"📋 스택 트레이스: {traceback.format_exc()}")
        
        error_body = {'error': str(e)}
        error_response = {
            'messageVersion': '1.0',
            'response': {
                'actionGroup': event.get('actionGroup', ''),
                'apiPath': event.get('apiPath', ''),
                'httpMethod': event.get('httpMethod', ''),
                'httpStatusCode': 500,
                'responseBody': {
                    'application/json': {
                        'body': error_body
                    }
                }
            }
        }
        
        print(f"📤 에러 응답: {json.dumps(error_response, ensure_ascii=False, default=str)}")
        return error_response

def search_classes(dynamodb, query):
    """DynamoDB에서 영상 검색 - 향상된 검색 로직"""
    
    print(f"🔍 검색 쿼리: {query}")
    
    # 검색어를 개별 키워드로 분리
    search_terms = [term.strip() for term in query.split() if term.strip()] if query else []
    
    print(f"🔎 검색어: {search_terms}")
    
    table_name = os.environ.get('DYNAMODB_TABLE_NAME', 'Class-7445a6ztsfdylpiczrn5hdh3ry-NONE')
    
    try:
        table = dynamodb.Table(table_name)
        
        # 검색어가 없으면 빈 결과 반환 (전체 스캔 방지)
        if not search_terms:
            print("⚠️ 검색어 없음 - 빈 결과 반환")
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'courses_found': 0,
                    'courses': [],
                    'message': '검색어를 입력해주세요.'
                }, ensure_ascii=False)
            }
        
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
        
        # 스캔 실행 (타임아웃 방지를 위해 Limit 감소)
        response = table.scan(
            FilterExpression=final_filter,
            Limit=20
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
        
        # 상위 5개만 반환 (스트리밍 성능 개선)
        top_classes = classes[:5]
        
        # 결과가 없을 때 메시지 추가
        message = f"'{' '.join(search_terms)}' 관련 강의 {len(top_classes)}개를 찾았습니다." if top_classes else f"'{' '.join(search_terms)}' 관련 강의를 찾지 못했습니다."
        
        result_data = {
            'courses_found': len(top_classes),
            'courses': [{
                'title': c['name'],
                'description': c['description'][:150] + '...' if len(c['description']) > 150 else c['description'],
                'url': c['url'],
                'author': c['author'],
                'difficulty': c['difficulty']
            } for c in top_classes],
            'message': message,
            'traces': [
                {'type': 'preprocessing', 'content': f"🔍 '{' '.join(search_terms)}' 검색 시작", 'timestamp': ''},
                {'type': 'function_call', 'content': f'⚡ DynamoDB에서 {len(classes)}개 항목 발견', 'timestamp': ''},
                {'type': 'observation', 'content': f'✅ 상위 {len(top_classes)}개 강의 선택 완료', 'timestamp': ''}
            ]
        }
        
        print(f"✅ 검색 완료: {len(top_classes)}개 영상 발견")
        print(f"📊 결과 데이터: {json.dumps(result_data, ensure_ascii=False)}")
        
        return {
            'statusCode': 200,
            'body': json.dumps(result_data, ensure_ascii=False)
        }
        
    except Exception as e:
        print(f"❌ 테이블 접근 오류: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Database error: {str(e)}'})
        }
