import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const trips=sqliteTable('shared_trips',{id:text('id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull(),updatedAt:text('updated_at').notNull()});
export const feedback=sqliteTable('participant_feedback',{tripId:text('trip_id').notNull(),personId:text('person_id').notNull(),seenRevision:integer('seen_revision'),checkin:text('checkin'),updatedAt:text('updated_at').notNull()},table=>[primaryKey({columns:[table.tripId,table.personId]})]);
