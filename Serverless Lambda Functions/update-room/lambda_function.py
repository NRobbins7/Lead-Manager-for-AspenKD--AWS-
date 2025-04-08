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
    """AWS Lambda function to update room details in an estimate."""
    try:
        # Parse request body
        body = json.loads(event.get("body", "{}"))
        room_id = body.get("room_id")
        room_type = body.get("room_type")
        cost = body.get("cost")
        cabinet_line = body.get("cabinet_line")
        door_type = body.get("door_type")
        color = body.get("color")

        # Validate required fields
        if not room_id or not room_type or cost is None or not cabinet_line or not door_type or not color:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing required parameters. Must include room_id, room_type, cost, cabinet_line, door_type, and color."})
            }

        connection = get_db_connection()
        with connection.cursor() as cursor:

            sql_check_room = "SELECT room_id FROM ESTIMATE_ROOMS WHERE room_id = %s"
            cursor.execute(sql_check_room, (room_id,))
            room_exists = cursor.fetchone()

            if not room_exists:
                return {
                    "statusCode": 400,
                    "headers": {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
                    },
                    "body": json.dumps({"error": "Invalid room_id. No such room exists."})
                }

            sql_update_room = """
            UPDATE ESTIMATE_ROOMS 
            SET room_type = %s, cost = %s, cabinet_line = %s, door_type = %s, color = %s
            WHERE room_id = %s;
            """
            cursor.execute(sql_update_room, (room_type, cost, cabinet_line, door_type, color, room_id))

            # Commit transaction
            connection.commit()

        # Close the connection
        connection.close()

        # Return success response
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
            },
            "body": json.dumps({
                "message": "Room updated successfully",
                "room_id": room_id
            })
        }


    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT"
            },
            "body": json.dumps({"error": str(e)})
        }
