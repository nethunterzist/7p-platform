-- Course Reviews & Rating System Migration
-- Adds course_reviews table with ratings, comments, and moderation features

-- Course reviews table
CREATE TABLE IF NOT EXISTS public.course_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_approved BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    reported_count INTEGER DEFAULT 0,
    moderator_notes TEXT,
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    -- Prevent duplicate reviews from same user
    UNIQUE(course_id, user_id)
);

-- Review helpfulness tracking
CREATE TABLE IF NOT EXISTS public.review_helpfulness (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES public.course_reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent duplicate votes from same user
    UNIQUE(review_id, user_id)
);

-- Course statistics view
CREATE OR REPLACE VIEW public.course_statistics AS
SELECT 
    c.id,
    c.title,
    c.instructor_id,
    COUNT(DISTINCT e.user_id) as total_enrollments,
    COUNT(DISTINCT r.id) as total_reviews,
    COUNT(DISTINCT CASE WHEN r.is_approved = true THEN r.id END) as approved_reviews,
    ROUND(AVG(CASE WHEN r.is_approved = true THEN r.rating END), 2) as average_rating,
    COUNT(DISTINCT CASE WHEN r.rating = 5 AND r.is_approved = true THEN r.id END) as five_star_reviews,
    COUNT(DISTINCT CASE WHEN r.rating = 4 AND r.is_approved = true THEN r.id END) as four_star_reviews,
    COUNT(DISTINCT CASE WHEN r.rating = 3 AND r.is_approved = true THEN r.id END) as three_star_reviews,
    COUNT(DISTINCT CASE WHEN r.rating = 2 AND r.is_approved = true THEN r.id END) as two_star_reviews,
    COUNT(DISTINCT CASE WHEN r.rating = 1 AND r.is_approved = true THEN r.id END) as one_star_reviews,
    MAX(r.created_at) as latest_review_date
FROM public.courses c
LEFT JOIN public.course_enrollments e ON c.id = e.course_id
LEFT JOIN public.course_reviews r ON c.id = r.course_id
GROUP BY c.id, c.title, c.instructor_id;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id ON public.course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_user_id ON public.course_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_rating ON public.course_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_course_reviews_approved ON public.course_reviews(is_approved, created_at);
CREATE INDEX IF NOT EXISTS idx_course_reviews_featured ON public.course_reviews(is_featured, created_at);
CREATE INDEX IF NOT EXISTS idx_review_helpfulness_review_id ON public.review_helpfulness(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpfulness_user_id ON public.review_helpfulness(user_id);

-- Updated timestamp triggers
CREATE TRIGGER update_course_reviews_updated_at 
    BEFORE UPDATE ON public.course_reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update helpful_count trigger function
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update the helpful_count in course_reviews
        UPDATE public.course_reviews 
        SET helpful_count = (
            SELECT COUNT(*) 
            FROM public.review_helpfulness 
            WHERE review_id = NEW.review_id AND is_helpful = true
        )
        WHERE id = NEW.review_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update the helpful_count in course_reviews
        UPDATE public.course_reviews 
        SET helpful_count = (
            SELECT COUNT(*) 
            FROM public.review_helpfulness 
            WHERE review_id = OLD.review_id AND is_helpful = true
        )
        WHERE id = OLD.review_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply helpful count trigger
CREATE TRIGGER update_helpful_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.review_helpfulness
    FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();

-- Enable RLS on new tables
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpfulness ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_reviews
CREATE POLICY "Anyone can view approved reviews" ON public.course_reviews
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view own reviews" ON public.course_reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enrolled users can create reviews" ON public.course_reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM public.course_enrollments 
            WHERE user_id = auth.uid() AND course_id = course_reviews.course_id
        )
    );

CREATE POLICY "Users can update own pending reviews" ON public.course_reviews
    FOR UPDATE USING (
        auth.uid() = user_id 
        AND is_approved = false
    );

CREATE POLICY "Instructors can view reviews of their courses" ON public.course_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE courses.id = course_id 
            AND courses.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Admins and moderators can manage all reviews" ON public.course_reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'moderator')
        )
    );

-- RLS Policies for review_helpfulness
CREATE POLICY "Anyone can view helpfulness votes" ON public.review_helpfulness
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote helpfulness" ON public.review_helpfulness
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own helpfulness votes" ON public.review_helpfulness
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own helpfulness votes" ON public.review_helpfulness
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON public.course_statistics TO anon, authenticated;
GRANT ALL ON public.course_reviews TO authenticated;
GRANT ALL ON public.review_helpfulness TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.course_reviews IS 'Course reviews and ratings with moderation features';
COMMENT ON TABLE public.review_helpfulness IS 'User votes on review helpfulness';
COMMENT ON VIEW public.course_statistics IS 'Aggregated course enrollment and review statistics';
COMMENT ON COLUMN public.course_reviews.rating IS 'Rating from 1-5 stars';
COMMENT ON COLUMN public.course_reviews.is_approved IS 'Whether review has been approved by moderator';
COMMENT ON COLUMN public.course_reviews.is_featured IS 'Whether review is featured prominently';
COMMENT ON COLUMN public.course_reviews.helpful_count IS 'Number of users who found this review helpful';