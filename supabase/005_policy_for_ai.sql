CREATE POLICY "allow read" ON users
FOR SELECT USING (true);

CREATE POLICY "allow read" ON transactions
FOR SELECT USING (true);

CREATE POLICY "allow read" ON disclosures
FOR SELECT USING (true);