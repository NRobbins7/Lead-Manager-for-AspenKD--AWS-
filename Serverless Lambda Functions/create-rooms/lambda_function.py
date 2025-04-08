import json
import pymysql
import os

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
    """AWS Lambda function to add a new room to an estimate."""
    try:
        # Parse request body
        body = event.get("body", {})

        if isinstance(body, str):
            body = json.loads(body)

        estimate_id = body.get("estimate_id")
        room_type = body.get("room_type")
        cost = body.get("cost")
        cabinet_line = body.get("cabinet_line")
        door_type = body.get("door_type")
        color = body.get("color")

        # Validate required fields
        if not estimate_id or not room_type or cost is None or not cabinet_line or not door_type or not color:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing required parameters. Must include estimate_id, room_type, cost, cabinet_line, door_type, and color."})
            }

        # Connect to the database
        connection = get_db_connection()
        with connection.cursor() as cursor:

            sql_check_estimate = "SELECT estimate_id FROM ESTIMATES WHERE estimate_id = %s"
            cursor.execute(sql_check_estimate, (estimate_id,))
            estimate_exists = cursor.fetchone()

            if not estimate_exists:
                return {
                    "statusCode": 400, 
                    "headers": {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "*",
                        "Access-Control-Allow-Methods": "*"
                    },
                    "body": json.dumps({"error": "Something went wrong"})
                }


            sql_insert_room = """
            INSERT INTO ESTIMATE_ROOMS (estimate_id, room_type, cost, cabinet_line, door_type, color)
            VALUES (%s, %s, %s, %s, %s, %s);
            """
            cursor.execute(sql_insert_room, (estimate_id, room_type, cost, cabinet_line, door_type, color))
            new_room_id = cursor.lastrowid  # Get the newly created room's ID

            # Commit transaction
            connection.commit()

        # Close the connection
        connection.close()

        return {
        "statusCode": 201,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*"
        },
        "body": json.dumps({
            "message": "New room added successfully",
            "room_id": new_room_id,
            "estimate_id": estimate_id
        })
}


    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "*"
            },
            "body": json.dumps({"error": "Something went wrong"})
        }

