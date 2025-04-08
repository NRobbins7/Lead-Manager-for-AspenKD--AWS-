import json
import pymysql
import os
import decimal

DB_HOST = "aspendb.c30uy2mwofbe.us-east-2.rds.amazonaws.com"
DB_USER = "aspenkd"
DB_PASSWORD = "mprezJ15N7Zs3wG2wDdW"
DB_NAME = "aspendb"

def get_db_connection():
    """Establish a database connection."""
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

def lambda_handler(event, context):
    """AWS Lambda function to fetch all rooms for a given estimate_id."""
    try:
        estimate_id = event.get("estimate_id")

        
        if not estimate_id:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({"error": "Missing required parameter: estimate_id"})
            }
        
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
            SELECT room_id, room_type, cost, cabinet_line, door_type, color 
            FROM ESTIMATE_ROOMS 
            WHERE estimate_id = %s;
            """
            cursor.execute(sql, (estimate_id,))
            rooms = cursor.fetchall()

        
        connection.close()

        class DecimalEncoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, decimal.Decimal):
                    return float(obj)
                return super(DecimalEncoder, self).default(obj)

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({"rooms": rooms}, cls=DecimalEncoder)
        }


    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({"error": str(e)})
        }
