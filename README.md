TUI Financial Intelligence Platform
A full-stack Business Intelligence web application developed as a Final Year Project for the Bachelor’s degree in Business Computing, specializing in Business Intelligence, at the Higher Institute of Management of Sousse (ISGS), Tunisia (academic year 2025–2026).

The platform brings financial data management, interactive dashboards, and AI-assisted financial insights together in one application. It was designed around financial reporting needs such as improving visibility into key performance indicators and reducing reliance on manual consolidation.
Academic project notice: This repository presents an academic project. It is not an official TUI product and is not endorsed by TUI. Do not publish company-confidential information, credentials, real financial records, or proprietary assets. Use synthetic/demo data in any public version.

Features
Financial data management
- Create, view, update, search, and delete financial records across four data categories.
- Centralized storage of financial information in a relational database.
Interactive financial dashboards
- Profitability: explore profitability indicators and financial performance.
- Balance sheet: review assets, liabilities, and related indicators.
- Liquidity: examine cash-flow and liquidity information.
- Payment cycles: review Days Sales Outstanding (DSO) and Days Payables Outstanding (DPO).
- Filter dashboard data by fiscal year and period.
- Export dashboard views for reporting where supported by the application.
User access management
- Authentication and role-based access control.
- Manager, team leader, and team member roles.
- Manage user accounts and control access to specific dashboards.
AI-assisted financial insights
- Generate financial interpretations from dashboard metrics.
- Generate dashboard-specific recommendations.
- Keep a history of previously generated insights.
- Uses the Cohere API; generated insights should support, not replace, professional financial judgement.
Technology stack
Layer	Technologies
Frontend	React, Vite, JavaScript, HTML, CSS, Tailwind CSS
Backend / REST API	Python, FastAPI
Database	PostgreSQL, SQLAlchemy ORM
AI integration	Cohere API
API testing	Postman
Development approach	Scrum and the GIMSI Business Intelligence methodology


Architecture
The application follows a three-layer architecture:
1. Presentation layer: the React frontend displays forms, management pages, and dashboards.
2. Application layer: the FastAPI backend handles authentication, permissions, CRUD operations, KPI calculations, and requests for AI-generated insights.
3. Data layer: PostgreSQL stores user accounts, financial records, dashboard permissions, and saved AI insights.
The backend communicates with PostgreSQL through SQLAlchemy. For AI features, the backend sends appropriately prepared prompts to Cohere and processes the returned response.
Getting started
The exact commands and configuration may vary depending on the folder names and dependency files in your repository. The instructions below are a starting point; check the project files before running them.
Prerequisites
- Python installed
- Node.js and npm installed
- PostgreSQL installed and running
- A Cohere API key if you want to use AI insight features
1. Clone the repository
git clone <YOUR_PUBLIC_REPOSITORY_URL>
cd <YOUR_REPOSITORY_FOLDER>
2. Configure the database
Create a PostgreSQL database for local development. Configure the backend's database connection using the environment-variable name or settings format expected by the source code.

Use only local development credentials. Never commit database passwords, API keys, or production connection strings.
3. Configure the backend
Open the backend directory (often named backend/ or similar), create and activate a Python virtual environment, and install the dependencies listed in the repository's dependency file (for example, requirements.txt).

Add the required local environment variables, including the database connection settings and Cohere API key, using the variable names expected by the application. Do not commit .env files containing secrets; include a sanitized .env.example instead.

Start the FastAPI application using the entry point defined in the project. FastAPI commonly provides interactive API documentation at /docs while the development server is running, unless that route has been disabled or changed.
4. Configure the frontend
Open the frontend directory (often named frontend/ or similar), install its dependencies using the package manager and lockfile provided by the repository, and configure the API base URL to point to your local FastAPI server.

Start the Vite development server using the script defined in package.json (commonly npm run dev). Open the local URL printed in the terminal.
5. Create a development account and test the application
Follow the account initialization process implemented by the project. If demo data is needed, use synthetic data only. Do not add real company records or personal information to a public repository.
Repository contents
The repository is expected to contain the frontend, backend, database-related configuration or scripts, and supporting documentation. Folder names and available scripts depend on the version you publish; update this section to match the actual repository structure.
project-root/
├── frontend/       # React + Vite application (example folder name)
├── backend/        # FastAPI application (example folder name)
├── .env.example    # Safe template for required environment variables
├── .gitignore
└── README.md
Development methodology
Development was organized into Scrum sprints and the dashboard design followed the GIMSI Business Intelligence methodology. The work was divided into three main areas:
1. User and financial data management.
2. Interactive financial dashboards.
3. DSO/DPO analysis and AI-powered interpretations and recommendations.
Security and data privacy
Before making this project public:
- Remove real company data, exports, screenshots, and confidential documents unless you have explicit permission to share them.
- Remove API keys, passwords, tokens, and database credentials from source code and Git history.
- Keep local .env files out of Git and provide only sanitized examples.
- Use synthetic data for screenshots, demonstrations, and testing.
- Review TUI branding and any third-party assets for permission to redistribute.
Limitations
- AI-generated interpretations and recommendations may be incomplete or inaccurate and should be reviewed by a qualified person.
- A working local setup requires the correct database configuration and, for AI functionality, a valid Cohere API key.
- This README describes the project based on its academic documentation. Verify the actual repository scripts, environment-variable names, and directory structure before publishing or running it.
Authors
- Douaa Jatlaoui
- Maryem Gassri
Final Year Project — Business Computing, Business Intelligence
Higher Institute of Management of Sousse (ISGS), University of Sousse, Tunisia
Academic year: 2025–2026
Acknowledgements
Academic supervisor: Dr. Nesrine Missaoui
Professional supervisor: Mr. Zied Guiga
If you reuse or adapt this project, please describe your changes and ensure that you have permission to share any third-party or organization-specific materials.
