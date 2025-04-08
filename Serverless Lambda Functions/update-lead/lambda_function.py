import json
import pymysql
import os

# DB credentials
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
        print("Raw event:", json.dumps(event))  

        job_id = int(event["job_id"])  
        title = event.get("title", "")
        address = event.get("address", "")
        city = event.get("city", "")
        state = event.get("state", "")
        zip_code = event.get("zip", "")
        status = event.get("status", "")
        type_ = event.get("type", "")
        notes = event.get("notes", "")

        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                UPDATE LEADS SET
                    title = %s,
                    address = %s,
                    city = %s,
                    state = %s,
                    zip = %s,
                    status = %s,
                    type = %s,
                    notes = %s
                WHERE job_id = %s;
            """
            cursor.execute(sql, (title, address, city, state, zip_code, status, type_, notes, job_id))
            connection.commit()

        connection.close()

        return {
            "statusCode": 200,
            "headers": { "Access-Control-Allow-Origin": "*" },
            "body": json.dumps({"message": "Lead updated successfully"})
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": { "Access-Control-Allow-Origin": "*" },
            "body": json.dumps({"error": str(e)})
        }
