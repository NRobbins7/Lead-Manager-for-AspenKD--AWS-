import json
import pymysql
import os
import datetime

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
    """AWS Lambda function to fetch all estimate versions for a given lead (job_id)."""
    try:
        # Get job_id from query parameters
        job_id = event.get("queryStringParameters", {}).get("job_id")
        
        if not job_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing required parameter: job_id"})
            }
        
        # Connect to the database
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Query to get all estimates for the given job_id
            sql = """
            SELECT estimate_id, version, created_at 
            FROM ESTIMATES 
            WHERE job_id = %s 
            ORDER BY created_at ASC;
            """
            cursor.execute(sql, (job_id,))
            estimates = cursor.fetchall()

        # Close the connection
        connection.close()


        def default_serializer(obj):
            if isinstance(obj, (datetime.date, datetime.datetime)):
                return obj.isoformat()
            raise TypeError("Type not serializable")


        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
    "body": json.dumps({"estimates": estimates}, default=default_serializer)
}


    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
