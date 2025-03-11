import numpy as np

# Define Earth constants (semi-major axis RE, semi-minor axis RP)
RE = 6378137.0           # Equatorial radius in meters
RP = 6356752.314245        # Polar radius in meters

# Exact ellipsoid radius at latitude phi
def ellipsoid_radius(phi):
    c = np.cos(phi)
    s = np.sin(phi)
    top = (RE*RE * c)**2 + (RP*RP * s)**2
    bot = (RE * c)**2     + (RP * s)**2
    return np.sqrt(top / bot)

# Generate sample points for phi in [0..pi/2]
num_samples = 200
phis = np.linspace(0, np.pi/2, num_samples)
true_vals = np.array([ellipsoid_radius(phi) for phi in phis])

# We'll approximate R as a polynomial in s2 = sin^2(phi)
s2 = np.sin(phis)**2

# Fit a polynomial of degree 4 (adjust as needed)
degree = 4
coeffs = np.polyfit(s2, true_vals, degree)  # returns highest-degree first
poly_approx = np.poly1d(coeffs)

print("Polynomial coefficients (highest degree first):")
print(coeffs)

# Compute maximum error over [0..pi/2]
approx_vals = poly_approx(s2)
errors = approx_vals - true_vals
max_error = np.max(np.abs(errors))
rms_error = np.sqrt(np.mean(errors**2))

print(f"Max error: {max_error:.4f} m")
print(f"RMS error: {rms_error:.4f} m")
