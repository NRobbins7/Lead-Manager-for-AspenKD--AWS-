import json
import pymysql
import os

DB_HOST = "aspendb.c30uy2mwofbe.us-east-2.rds.amazonaws.com"
DB_USER = "aspenkd"
DB_PASSWORD = "mprezJ15N7Zs3wG2wDdW"
DB_NAME = "aspendb"

def get_db_connection():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        estimate_id = body.get("estimate_id")

        if not estimate_id:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,DELETE",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                "body": json.dumps({"error": "Missing estimate_id"})
            }

        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM ESTIMATE_ROOMS WHERE estimate_id = %s", (estimate_id,))
            cursor.execute("DELETE FROM ESTIMATES WHERE estimate_id = %s", (estimate_id,))
            connection.commit()

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,DELETE",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({"message": f"Estimate {estimate_id} deleted successfully"})
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,DELETE",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({"error": str(e)})
        }
