import json
import pymysql
import os

# Database configuration
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
        print("Event:", json.dumps(event))  

        job_id = event.get("job_id")
        if not job_id:
            return {
                "statusCode": 400,
                "headers": { "Access-Control-Allow-Origin": "*" },
                "body": json.dumps({"error": "Missing required parameter: job_id"})
            }

        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql_latest = """
            SELECT estimate_id, version 
            FROM ESTIMATES 
            WHERE job_id = %s 
            ORDER BY created_at DESC 
            LIMIT 1;
            """
            cursor.execute(sql_latest, (job_id,))
            latest_estimate = cursor.fetchone()

            if not latest_estimate:
                new_version = "v0"
            else:
                latest_version = int(latest_estimate["version"][1:])
                new_version = f"v{latest_version + 1}"

            sql_insert = "INSERT INTO ESTIMATES (job_id, version) VALUES (%s, %s);"
            cursor.execute(sql_insert, (job_id, new_version))
            new_estimate_id = cursor.lastrowid

            if latest_estimate:
                sql_copy_rooms = """
                INSERT INTO ESTIMATE_ROOMS (estimate_id, room_type, cost, cabinet_line, door_type, color)
                SELECT %s, room_type, cost, cabinet_line, door_type, color 
                FROM ESTIMATE_ROOMS 
                WHERE estimate_id = %s;
                """
                cursor.execute(sql_copy_rooms, (new_estimate_id, latest_estimate["estimate_id"]))

            connection.commit()
        connection.close()

        print("Returning:", json.dumps({
            "message": "New estimate created",
            "estimate_id": new_estimate_id,
            "version": new_version
        }))

        return {
            "statusCode": 201,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "message": "New estimate created",
                "estimate_id": new_estimate_id,
                "version": new_version
            })
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
