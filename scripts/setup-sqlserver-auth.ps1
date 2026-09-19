$ErrorActionPreference = 'Stop'

$backendPath = Join-Path $PSScriptRoot '..\backend'
$nativePath = Join-Path $backendPath 'native'
$dllPath = Join-Path $nativePath 'mssql-jdbc_auth-12.8.1.x64.dll'
$downloadUrl = 'https://repo1.maven.org/maven2/com/microsoft/sqlserver/mssql-jdbc_auth/12.8.1.x64/mssql-jdbc_auth-12.8.1.x64.dll'

New-Item -ItemType Directory -Path $nativePath -Force | Out-Null
if (-not (Test-Path $dllPath)) {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $dllPath
    Write-Host "Downloaded SQL Server authentication DLL to $dllPath"
} else {
    Write-Host "SQL Server authentication DLL already exists at $dllPath"
}