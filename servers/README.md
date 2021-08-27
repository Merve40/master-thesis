# Demo: Inland Waterway Transportation Use Case

## Stakeholders:

**Charterer:**

-   create charterparty -> pick shipowner
-   sign charterparty
-   read & check B/L

**Shipowner:**

-   sign charterparty
-   assign master/shipleader
-   assign hier agents at loading & discharging ports

    -   **Master/Skipper:**

        -   issue B/L
        -   retrieve certificate issued by port agent
        -   (Issue statement of facts (_SOF_): events at ports, e.g. departure time, arrival time, loading time, unloading time)
        -   (status update during shipment, e.g. holds conditions like temperature)

    -   **Port Agent:**
        -   add info about goods to B/L (e.g. moisture-level)
        -   sign the B/L
        -   issue certificate
        -   issue & sign proof of delivery (POD)

**Trader:**

-   check status of shipment
-   notify supplier

**Supplier:**

-   check provenance of goods (origin port, moisture level, nutrition, etc.)
-   validate information in B/L

---
