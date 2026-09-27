-- Estructura de la base de datos del reto (db_WebDevUMG)
-- Basada en el diagrama de modelo relacional del enunciado.
-- Las tablas ya existen en el servidor del curso; este script queda como documentacion.

CREATE TABLE Estudiantes (
    Carnet  VARCHAR(25)   NOT NULL PRIMARY KEY,
    Nombre  NVARCHAR(150) NOT NULL,
    Correo  NVARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE Misiones (
    MisionID    INT IDENTITY(1,1) PRIMARY KEY,
    Nombre      NVARCHAR(100) NOT NULL UNIQUE,
    Descripcion NVARCHAR(250) NULL
);

CREATE TABLE EstudianteMisiones (
    DetalleID     INT IDENTITY(1,1) PRIMARY KEY,
    Carnet        VARCHAR(25) NOT NULL,
    MisionID      INT         NOT NULL,
    Estado        BIT         NOT NULL,
    FechaRegistro DATETIME    DEFAULT GETDATE(),
    CONSTRAINT FK_EstudianteMisiones_Estudiantes FOREIGN KEY (Carnet)   REFERENCES Estudiantes (Carnet),
    CONSTRAINT FK_EstudianteMisiones_Misiones    FOREIGN KEY (MisionID) REFERENCES Misiones (MisionID),
    CONSTRAINT UQ_EstudianteMision UNIQUE (Carnet, MisionID)
);
