import json
import pymysql

DB_HOST = "aspendb.c30uy2mwofbe.us-east-2.rds.amazonaws.com"
DB_USER = "aspenkd"
DB_PASSWORD = "mprezJ15N7Zs3wG2wDdW"
DB_NAME = "aspendb"

def lambda_handler(event, context):
    try:
        print("Full event received:", json.dumps(event, indent=2)) 

        if "body" in event:
            print("Processing event['body']")
            body = json.loads(event["body"])
        else:
            print(" No 'body' found in event. Using raw event instead.")
            body = event 

        contact_id = body.get('contact_id')
        title = body.get('title')
        address = body.get('address', None)
        city = body.get('city', None)
        state = body.get('state', None)
        zip_code = body.get('zip', None)
        status = body.get('status', None)
        lead_type = body.get('type', None)
        duedate = body.get('duedate', None)
        notes = body.get('notes', None)

        if not contact_id or not title:
            raise ValueError(f"Missing required fields: contact_id={contact_id}, title={title}")

        print("Connecting to MySQL...")
        connection = pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASSWORD, database=DB_NAME)
        cursor = connection.cursor()

        sql = """INSERT INTO LEADS (contact_id, title, address, city, state, zip, status, type, duedate, notes) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
        values = (contact_id, title, address, city, state, zip_code, status, lead_type, duedate, notes)
        print(f"Executing SQL: {sql} with values {values}")

        cursor.execute(sql, values)
        connection.commit()
        
        lead_id = cursor.lastrowid
        print(f" Lead inserted successfully with ID: {lead_id}")

        cursor.close()
        connection.close()

        return {
            "statusCode": 201,
            "body": json.dumps({"message": "Lead created successfully", "lead_id": lead_id})
        }

    except Exception as e:
        print("Error:", str(e)) 
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
