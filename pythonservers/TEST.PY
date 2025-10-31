from FlightRadar24 import FlightRadar24API
fr = FlightRadar24API()
print(fr.get_airports(query="Hyderabad"))
print(fr.get_airports(query="Delhi"))
