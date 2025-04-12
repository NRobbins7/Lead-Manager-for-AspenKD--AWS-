# Aspen Lead/Job Management Web Application

## Purpose: 

This web app, created with AWS, is meant to be a management and workflow control application for Aspen Kitchens and Design, Keystone Remodeling's sister company, such that they can ensure consistency across leads as they come up. 
It is important that, as lead opportunities arise, the company is able to keep track of key details of the lead, such as who it is for, where it is, and when it is due. This web app allows them to create leads and store them, dynamically see all current leads, edit their information, and create estimate proposals and store them within each of the leads. 

## Future Plans

In the future, I plan to make it so that when an estimate for a lead opportunity is accepted by the customer, the lead status becomes 'sold', and then it is given a checklist for every step that needs to take place for the job to be completed, so that a lead can be created, tracked, and managed every step of the way until it is completed. This ensures consistency and efficiency in workflow, making it as easy as possible for the company to deliver its quality product.

## Methodology

This web app was created with a serverless architecture methodology, with the logical flow being from the static website front end (S3 Bucket), to an API Gateway, with several routes that each integrate into Lambda functions, all interacting with the app's RDS Database.

I have had ChatGPT help me create a table for the structure, which is what you see below:

- **Frontend**: Hosted on S3 as a static website. All HTML, CSS, and JavaScript files are bundled and deployed here.
- **Backend**: Composed of individual AWS Lambda functions, each responsible for a specific task (e.g., create lead, fetch contact list).
- **API Gateway**: Connects frontend HTTP requests to the appropriate Lambda function.
- **Database**: A MySQL-compatible RDS instance handles persistent storage, with tables for `CONTACTS`, `LEADS`, `ESTIMATES`, `ROOMS`, and `JOBS`.

## Architecture Overview

### **Frontend** (AWS S3 Static Website)
- `index.html` – View all leads
- `newContact.html` – Add a new contact
- `contactList.html` – Select contact for new lead
- `newLead.html` – Add a new lead (requires contact selection)
- `leadDetails.html` – View/edit lead and manage estimate proposals

### **API Gateway Routes → Lambda Functions**
| Route | Method | Lambda Function | Description |
|-------|--------|------------------|-------------|
| `/create-contact` | POST | `create-contact` | Adds a contact to the database |
| `/get-contacts` | GET | `get-contacts` | Returns all contacts |
| `/create-lead` | POST | `create-lead` | Adds a new lead (and v1 estimate) |
| `/get-all-leads` | GET | `get-all-leads` | Returns all leads with contact names |
| `/get-lead-details` | GET | `get-lead-details` | Fetch full details of a lead |
| `/update-lead` | PUT | `update-lead` | Update lead fields |
| `/create-estimate` | POST | `create-estimate` | Duplicates rooms from previous estimate |
| `/get-estimates` | GET | `get-estimates` | Retrieves estimate versions for a lead |
| `/create-room` | POST | `create-room` | Adds a room to an estimate |
| `/get-rooms` | GET | `get-rooms` | Lists rooms for a given estimate |
| `/update-room` | PUT | `update-room` | Update room details |
| `/update-estimate` | PUT | `update-estimate` | Update estimate status and due date |
| `/delete-room` | DELETE | `delete-room` | Deletes a room from an estimate |
| `/delete-estimate` | DELETE | `delete-estimate` | Deletes the most recent estimate version |

### **Database Schema (MySQL on RDS)**

- **CONTACTS**: Stores client contact information.
- **LEADS**: Tied to a contact, tracks job opportunity status, type, and notes.
- **ESTIMATES**: Tracks estimate proposals (`v1`, `v2`, etc.) for each lead.
- **ROOMS**: Detailed line items under each estimate version.
- **JOBS**: Optional table for financial tracking post-lead conversion.

# Security

I am using AWS Cognito to add security to the web app, given the sensitive customer information it works with. I am currently in the process of getting an https domain to allow the app to use Cognito.