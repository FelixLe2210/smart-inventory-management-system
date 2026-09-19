# Registration API

The backend exposes `POST /api/auth/register`. A new account is created in
`Users` and assigned the `Warehouse Staff` role in `UserRoles` in one database
transaction.

Start the backend from the `backend` directory:

```powershell
..\scripts\setup-sqlserver-auth.ps1
.\mvnw.cmd spring-boot:run
```

For SQL Server Windows Authentication, the JDBC driver must be able to use
integrated authentication. The setup script downloads the required Microsoft
authentication DLL into `backend/native`. Alternatively, set `DB_URL`,
`DB_USERNAME`, and `DB_PASSWORD` before starting the application.

Example request:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/auth/register `
  -ContentType 'application/json' `
  -Body '{"username":"new.staff","password":"StrongPass123","fullName":"New Staff","email":"new.staff@example.com"}'
```

Expected response: HTTP `201 Created` with the generated `userId` and assigned
role. Passwords are stored only as BCrypt hashes. Duplicate usernames or emails
return HTTP `409 Conflict`; invalid input returns HTTP `400 Bad Request`.

## Login

Use `POST /api/auth/login` with a username or email and password:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8080/api/auth/login `
  -ContentType 'application/json' `
  -Body '{"usernameOrEmail":"new.staff","password":"StrongPass123"}'
```

Successful login returns HTTP `200 OK` with the user, role names, and a JWT in
`accessToken`. The token contains `userId`, `roles`, `iat`, and `exp` claims and
expires after one hour by default. Configure `JWT_SECRET` with a secret of at
least 32 bytes in non-development environments.