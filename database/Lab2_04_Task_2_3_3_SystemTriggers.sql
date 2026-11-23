USE RestaurantDB;
GO

SELECT
    S2.[name] AS TableName,
    S1.[name] AS TriggerName,
    CASE
        WHEN S2.deltrig = S1.id THEN 'Delete'
        WHEN S2.instrig = S1.id THEN 'Insert'
        WHEN S2.updtrig = S1.id THEN 'Update'
        ELSE 'INSTEAD OF / Multiple'
    END AS 'TriggerType',
    'S1' AS S1_Marker,
    S1.id AS TriggerID,
    S1.xtype AS ObjectType,
    S1.crdate AS CreatedDate,
    'S2' AS S2_Marker,
    S2.id AS TableID,
    S2.deltrig,
    S2.instrig,
    S2.updtrig
FROM sysobjects S1
JOIN sysobjects S2 ON S1.parent_obj = S2.[id]
WHERE S1.xtype = 'TR';
GO

SELECT S2.[name] TableName, S1.[name] TriggerName,
CASE
WHEN S2.deltrig = s1.id THEN 'Delete'
WHEN S2.instrig = s1.id THEN 'Insert'
WHEN S2.updtrig = s1.id THEN 'Update'
END 'TriggerType' , 'S1',s1.*,'S2',s2.*
FROM sysobjects S1 JOIN sysobjects S2 ON S1.parent_obj = S2.[id]
WHERE S1.xtype='TR';
GO
