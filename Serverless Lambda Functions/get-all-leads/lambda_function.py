import json
import pymysql
from datetime import date

DB_HOST = "aspendb.c30uy2mwofbe.us-east-2.rds.amazonaws.com"
DB_USER = "aspenkd"
DB_PASSWORD = "mprezJ15N7Zs3wG2wDdW"
DB_NAME = "aspendb"

class DateEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, date):
            return obj.strftime("%Y-%m-%d") 
        return super().default(obj)

def lambda_handler(event, context):
    try:
        print("Fetching all leads...")

        connection = pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASSWORD, database=DB_NAME)
        cursor = connection.cursor(pymysql.cursors.DictCursor)

        sql = "SELECT LEADS.job_id, CONTACTS.name AS contact_name, LEADS.title, LEADS.address, LEADS.city, LEADS.state, LEADS.zip, LEADS.status, LEADS.type, LEADS.duedate, LEADS.notes FROM LEADS JOIN CONTACTS ON LEADS.contact_id = CONTACTS.contact_id ORDER BY LEADS.created_at DESC;"
        cursor.execute(sql)
        leads = cursor.fetchall()

        cursor.close()
        connection.close()

        print(f"Fetched {len(leads)} leads.")

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({"leads": leads}, cls=DateEncoder)  
        }

    except Exception as e:
        print("Error:", str(e))
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)})
        }
