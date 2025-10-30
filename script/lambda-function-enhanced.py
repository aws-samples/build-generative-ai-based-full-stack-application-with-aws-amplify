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
    """DynamoDB에서 영상 검색 - description 기반 간단 검색"""
    
    print(f"🔍 검색 쿼리: {query}")
    
    # 검색어를 개별 키워드로 분리
    search_terms = [term.strip().lower() for term in query.split() if term.strip()] if query else []
    
    print(f"🔎 검색어: {search_terms}")
    
    table_name = os.environ['DYNAMODB_TABLE_NAME']
    
    try:
        table = dynamodb.Table(table_name)
        
        # 검색어가 없으면 빈 결과 반환
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
        
        # 활성 영상만 조회
        base_filter = Attr('class_flag').ne(10) & (Attr('class_flag').eq(0) | Attr('class_flag').not_exists())
        
        # name과 description 필드에서 대소문자 구분 없이 검색
        search_conditions = []
        for term in search_terms:
            term_lower = term.lower()
            term_upper = term.upper()
            term_title = term.title()
            
            search_conditions.append(
                Contains(Attr('name'), term) |
                Contains(Attr('name'), term_lower) |
                Contains(Attr('name'), term_upper) |
                Contains(Attr('name'), term_title) |
                Contains(Attr('description'), term) |
                Contains(Attr('description'), term_lower) |
                Contains(Attr('description'), term_upper) |
                Contains(Attr('description'), term_title)
            )
        
        # OR 조건으로 결합
        search_filter = search_conditions[0]
        for condition in search_conditions[1:]:
            search_filter = search_filter | condition
        
        final_filter = base_filter & search_filter
        
        # 스캔 실행
        response = table.scan(
            FilterExpression=final_filter,
            Limit=20
        )
        
        print(f"📊 스캔 결과: {len(response.get('Items', []))}개 항목")
        
        # 결과 포맷팅 - thumbnail과 URL만 포함
        classes = []
        for item in response.get('Items', []):
            class_info = {
                'title': str(item.get('name', '')),
                'description': str(item.get('description', ''))[:150] + '...' if len(str(item.get('description', ''))) > 150 else str(item.get('description', '')),
                'url': str(item.get('url', '')),
                'thumbnail': str(item.get('image', '')),
                'author': str(item.get('author', '')),
                'difficulty': str(item.get('difficulty', 'intermediate'))
            }
            classes.append(class_info)
        
        # 상위 5개만 반환
        top_classes = classes[:5]
        
        message = f"'{' '.join(search_terms)}' 관련 강의 {len(top_classes)}개를 찾았습니다." if top_classes else f"'{' '.join(search_terms)}' 관련 강의를 찾지 못했습니다."
        
        result_data = {
            'courses_found': len(top_classes),
            'courses': top_classes,
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
