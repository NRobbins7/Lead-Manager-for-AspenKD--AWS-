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
    job_id = event.get("job_id")


    if not job_id:
        return {"statusCode": 400, "body": json.dumps({"error": "Missing job_id"})}

    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
            SELECT job_id, contact_id, title, address, city, state, zip, status, type, duedate, notes
            FROM LEADS WHERE job_id = %s;
            """
            cursor.execute(sql, (job_id,))
            lead = cursor.fetchone()
            if lead and "duedate" in lead and lead["duedate"]:
                lead["duedate"] = lead["duedate"].strftime("%Y-%m-%d")

        connection.close()

        if not lead:
            return {"statusCode": 404, "body": json.dumps({"error": "Lead not found"})}

        return {"statusCode": 200, "body": json.dumps(lead)}

    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
