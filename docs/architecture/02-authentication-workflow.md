sequenceDiagram
    participant User
    participant Auth Service
    participant Validation

    User->>Auth Service: Request Login
    Auth Service->>Validation: Validate Credentials
    alt Successful Validation
        Validation-->>Auth Service: Valid
        Auth Service-->>User: Login Success
    else Failed Validation
        Validation-->>Auth Service: Invalid
        Auth Service-->>User: Login Failure
    end
    deactivate Validation