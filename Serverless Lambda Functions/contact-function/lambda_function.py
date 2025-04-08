import json
import pymysql
import os

DB_HOST = "aspendb.c30uy2mwofbe.us-east-2.rds.amazonaws.com"
DB_USER = "aspenkd"
DB_PASSWORD = "mprezJ15N7Zs3wG2wDdW"
DB_NAME = "aspendb"

def lambda_handler(event, context):
    try:
        print("Received event:", json.dumps(event)) 
        
        body = event if isinstance(event, dict) else json.loads(event['body'])
        
        name = body.get('name')
        display_name = body.get('display_name')
        address = body.get('address')
        city = body.get('city')
        state = body.get('state')
        zip_code = body.get('zip')
        phone = body.get('phone')
        email = body.get('email')
        label = body.get('label')

        if not all([name, display_name, address, city, state, zip_code, phone, email, label]):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required fields'})
            }
        
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        
        with connection.cursor() as cursor:
            sql = "INSERT INTO CONTACTS (name, displayname, address, city, state, zip, phone, email, label) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
            cursor.execute(sql, (name, display_name, address, city, state, zip_code, phone, email, label))
            connection.commit()
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Contact created successfully!'})
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
