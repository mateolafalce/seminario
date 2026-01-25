# Workflow de Matcheo - Cliente

Link al [video](https://youtu.be/V-lUZKgtTCo) en YT.


Este diagrama representa el flujo de actividades del cliente para reservar una cancha y realizar el matcheo de jugadores.

```mermaid
flowchart TD
    subgraph Cliente
        Start((●)) --> ListarTurnos[/"Listar Turnos"/]
        
        ListarTurnos --> ReservarCancha[/"Reservar Cancha"/]
        ReservarCancha -.- Nota1["- Cancha<br>- Horario<br>- Fecha"]
        
        ReservarCancha --> DefinirCantidad[/"Definir Cantidad de<br>Jugadores"/]
        DefinirCantidad -.- Nota2["- Buscar por username / nombre"]
        
        DefinirCantidad --> Decision{"¿Invitas a otros Jugadores<br>Manualmente?"}
        
        Decision -->|NO| EjecutarAlgoritmo[/"Ejecutar Algoritmo<br>Matcheo"/]
        Decision -->|SI| SeleccionarJugadores[/"Seleccionar Jugadores"/]
        
        EjecutarAlgoritmo --> EnviarMail[/"Enviar Mail de Matcheo"/]
        SeleccionarJugadores --> EnviarMail
        
        EnviarMail --> End((◉))
    end

    style Start fill:#000,stroke:#000,color:#fff
    style End fill:#fff,stroke:#000
    style Decision fill:#fff8dc,stroke:#d4a574
    style ListarTurnos fill:#ffefd5,stroke:#d4a574
    style ReservarCancha fill:#ffefd5,stroke:#d4a574
    style DefinirCantidad fill:#ffefd5,stroke:#d4a574
    style EjecutarAlgoritmo fill:#ffefd5,stroke:#d4a574
    style SeleccionarJugadores fill:#ffefd5,stroke:#d4a574
    style EnviarMail fill:#ffefd5,stroke:#d4a574
    style Nota1 fill:#fffef0,stroke:#ccc
    style Nota2 fill:#fffef0,stroke:#ccc
```

## Descripción del Flujo

1. **Listar Turnos**: El cliente visualiza los turnos disponibles
2. **Reservar Cancha**: Selecciona cancha, horario y fecha
3. **Definir Cantidad de Jugadores**: Establece cuántos jugadores necesita
4. **Decisión de Matcheo**:
   - **SI** (manual): Busca y selecciona jugadores por username/nombre
   - **NO** (automático): Ejecuta el algoritmo de matcheo
5. **Enviar Mail de Matcheo**: Notifica a los jugadores seleccionados
