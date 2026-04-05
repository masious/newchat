DROP INDEX "conversation_members_user_id_idx";--> statement-breakpoint
CREATE INDEX "conversation_members_user_id_idx" ON "conversation_members" USING btree ("user_id","conversation_id");